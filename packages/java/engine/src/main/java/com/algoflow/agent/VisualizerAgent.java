package com.algoflow.agent;

import com.algoflow.visualiser.VisualizerRegistry;
import net.bytebuddy.agent.builder.AgentBuilder;
import net.bytebuddy.asm.Advice;
import net.bytebuddy.description.type.TypeDescription;
import net.bytebuddy.dynamic.ClassFileLocator;
import net.bytebuddy.dynamic.loading.ClassInjector;
import net.bytebuddy.matcher.ElementMatchers;

import java.io.File;
import java.io.IOException;
import java.lang.instrument.Instrumentation;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.nio.file.Files;
import java.util.LinkedList;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

import static net.bytebuddy.agent.builder.AgentBuilder.RedefinitionStrategy.RETRANSFORMATION;
import static net.bytebuddy.matcher.ElementMatchers.*;

public class VisualizerAgent {

    public static void premain(String args, Instrumentation inst) throws IOException, NoSuchFieldException,
            IllegalAccessException, InstantiationException, NoSuchMethodException, InvocationTargetException {

        System.err.println("[VisualizerAgent] Starting agent...");
        File temp = Files.createTempDirectory("temp").toFile();

        // 1. INJECT into Bootstrap
        var result = ClassInjector.UsingInstrumentation
                .of(temp, ClassInjector.UsingInstrumentation.Target.BOOTSTRAP, inst)
                .inject(Map.of(new TypeDescription.ForLoadedType(VisualizerBridge.class),
                        ClassFileLocator.ForClassLoader.read(VisualizerBridge.class)));

        // We get the CLASS object that belongs to the Bootstrap loader
        Class<?> bootBridge = result.get(new TypeDescription.ForLoadedType(VisualizerBridge.class));

        BiConsumer<Object, Object[]> onGet = VisualizerRegistry::onGet;
        BiConsumer<Object, Object[]> onSet = VisualizerRegistry::onSet;
        BiConsumer<Object, Object[]> onAdd = VisualizerRegistry::onAdd;
        Consumer<Object> onClear = VisualizerRegistry::onClear;
        Consumer<String> onPrintln = VisualizerRegistry::onPrintln;
        Consumer<String> onPrint = VisualizerRegistry::onPrint;
        BiConsumer<Object, Object[]> onRemove = VisualizerRegistry::onRemove;

        Field getListener = bootBridge.getField("getListener");
        getListener.setAccessible(true);
        getListener.set(null, onGet);

        Field setListener = bootBridge.getField("setListener");
        setListener.setAccessible(true);
        setListener.set(null, onSet);

        Field addListener = bootBridge.getField("addListener");
        addListener.setAccessible(true);
        addListener.set(null, onAdd);

        Field clearListener = bootBridge.getField("clearListener");
        clearListener.setAccessible(true);
        clearListener.set(null, onClear);

        Field printlnListener = bootBridge.getField("printlnListener");
        printlnListener.setAccessible(true);
        printlnListener.set(null, onPrintln);

        Field printListenerField = bootBridge.getField("printListener");
        printListenerField.setAccessible(true);
        printListenerField.set(null, onPrint);

        Field removeListener = bootBridge.getField("removeListener");
        removeListener.setAccessible(true);
        removeListener.set(null, onRemove);

        BiConsumer<Object, Object> onIteratorCreated = VisualizerRegistry::onIteratorCreated;
        Consumer<Object> onIteratorNext = VisualizerRegistry::onIteratorNext;

        Field iteratorNextListenerField = bootBridge.getField("iteratorNextListener");
        iteratorNextListenerField.setAccessible(true);
        iteratorNextListenerField.set(null, onIteratorNext);

        Field iteratorCreatedListenerField = bootBridge.getField("iteratorCreatedListener");
        iteratorCreatedListenerField.setAccessible(true);
        iteratorCreatedListenerField.set(null, onIteratorCreated);

        BiConsumer<Object, Object[]> onMapPut = VisualizerRegistry::onMapPut;
        BiConsumer<Object, Object[]> onMapGet = VisualizerRegistry::onMapGet;
        BiConsumer<Object, Object[]> onMapRemove = VisualizerRegistry::onMapRemove;
        Consumer<Object> onMapClear = VisualizerRegistry::onMapClear;

        for (String fieldName : new String[]{"mapPutListener", "mapGetListener", "mapRemoveListener", "mapClearListener"}) {
            Field f = bootBridge.getField(fieldName);
            f.setAccessible(true);
            f.set(null, switch (fieldName) {
                case "mapPutListener" -> onMapPut;
                case "mapGetListener" -> onMapGet;
                case "mapRemoveListener" -> onMapRemove;
                case "mapClearListener" -> onMapClear;
                default -> throw new IllegalStateException();
            });
        }

        BiConsumer<Object, Object[]> onContains = VisualizerRegistry::onContains;
        Field containsListenerField = bootBridge.getField("containsListener");
        containsListenerField.setAccessible(true);
        containsListenerField.set(null, onContains);

        Consumer<Object> onApiMutate = VisualizerRegistry::onApiMutate;
        Field apiMutateListenerField = bootBridge.getField("apiMutateListener");
        apiMutateListenerField.setAccessible(true);
        apiMutateListenerField.set(null, onApiMutate);

        new AgentBuilder.Default().disableClassFormatChanges().with(RETRANSFORMATION)
                .with(AgentBuilder.RedefinitionStrategy.Listener.StreamWriting.toSystemError())
                .with(AgentBuilder.Listener.StreamWriting.toSystemError().withTransformationsOnly())
                .with(AgentBuilder.InstallationListener.StreamWriting.toSystemError())
                .ignore(nameStartsWith("net.bytebuddy.").or(nameStartsWith("jdk.internal.reflect."))
                        .or(nameStartsWith("java.lang.invoke.")).or(nameStartsWith("com.sun.proxy.")))
                .with(AgentBuilder.InitializationStrategy.NoOp.INSTANCE).type(nameStartsWith("com.algoflow.runner"))
                .transform((builder, type, classLoader, module, protectionDomain) -> {
                    System.err.println("[VisualizerAgent] Transforming: " + type.getName());
                    return builder.visit(Advice.to(ConstructorInterceptor.class).on(isConstructor()))
                            .visit(Advice.to(StaticInitInterceptor.class).on(isTypeInitializer()))
                            .visit(Advice.to(RecursionInterceptor.EnterInterceptor.class)
                                    .on(not(isConstructor().or(isTypeInitializer()))))
                            .visit(Advice.to(RecursionInterceptor.ExitInterceptor.class)
                                    .on(not(isConstructor().or(isTypeInitializer()))))
                            .visit(new LocalVariableTrackerWrapper()).visit(new FieldAccessWrapper())
                            .visit(new ArrayAccessWrapper());
                })
                .type(ElementMatchers.is(java.util.ArrayList.class).or(ElementMatchers.is(LinkedList.class))
                        .or(ElementMatchers.is(java.util.Stack.class)))
                .transform((builder, type, classLoader, module, protectionDomain) -> {
                    return builder
                            .visit(Advice.to(ListInterceptor.GetInterceptor.class)
                                    .on(named("get").and(takesArguments(int.class))))
                            .visit(Advice.to(ListInterceptor.SetInterceptor.class)
                                    .on(named("set").and(takesArguments(int.class, Object.class))))
                            .visit(Advice.to(CollectionInterceptor.AddInterceptor.class)
                                    .on(named("add").or(named("offer")).or(named("push"))
                                            .or(named("addFirst")).or(named("addLast"))
                                            .or(named("offerFirst")).or(named("offerLast"))))
                            .visit(Advice.to(CollectionInterceptor.RemoveInterceptor.class)
                                    .on(named("remove").or(named("poll")).or(named("pop"))
                                            .or(named("pollFirst")).or(named("pollLast"))
                                            .or(named("removeFirst")).or(named("removeLast"))))
                            .visit(Advice.to(CollectionInterceptor.ClearInterceptor.class)
                                    .on(named("clear").and(takesArguments(0))))
                            .visit(Advice.to(CollectionInterceptor.ContainsInterceptor.class)
                                    .on(named("contains").and(takesArguments(Object.class))));
                })
                .type(ElementMatchers.is(java.util.ArrayDeque.class)
                        .or(ElementMatchers.is(java.util.PriorityQueue.class))
                        .or(ElementMatchers.is(java.util.HashSet.class))
                        .or(ElementMatchers.is(java.util.LinkedHashSet.class))
                        .or(ElementMatchers.is(java.util.TreeSet.class)))
                .transform((builder, type, classLoader, module, protectionDomain) -> {
                    return builder
                            .visit(Advice.to(CollectionInterceptor.AddInterceptor.class)
                                    .on(named("add").or(named("offer")).or(named("push"))
                                            .or(named("addFirst")).or(named("addLast"))
                                            .or(named("offerFirst")).or(named("offerLast"))))
                            .visit(Advice.to(CollectionInterceptor.RemoveInterceptor.class)
                                    .on(named("poll").or(named("pop")).or(named("remove"))
                                            .or(named("pollFirst")).or(named("pollLast"))
                                            .or(named("removeFirst")).or(named("removeLast"))))
                            .visit(Advice.to(CollectionInterceptor.ClearInterceptor.class)
                                    .on(named("clear").and(takesArguments(0))))
                            .visit(Advice.to(CollectionInterceptor.ContainsInterceptor.class)
                                    .on(named("contains").and(takesArguments(Object.class))));
                }).type(ElementMatchers.is(java.io.PrintStream.class))
                .transform((builder, type, classLoader, module, protectionDomain) -> {
                    return builder
                            .visit(Advice.to(PrintStreamInterceptor.PrintlnInterceptor.class)
                                    .on(named("writeln").and(takesArguments(String.class))))
                            .visit(Advice.to(PrintStreamInterceptor.PrintInterceptor.class)
                                    .on(named("write").and(takesArguments(String.class))));
                }).type(ElementMatchers.isSubTypeOf(java.util.Iterator.class).and(nameStartsWith("java.util.")))
                .transform((builder, type, classLoader, module, protectionDomain) -> {
                    return builder.visit(Advice.to(IteratorInterceptor.NextInterceptor.class)
                            .on(named("next").and(takesArguments(0))));
                })
                .type(ElementMatchers.is(java.util.ArrayList.class).or(ElementMatchers.is(LinkedList.class))
                        .or(ElementMatchers.is(java.util.Stack.class))
                        .or(ElementMatchers.is(java.util.ArrayDeque.class))
                        .or(ElementMatchers.is(java.util.PriorityQueue.class))
                        .or(ElementMatchers.is(java.util.HashSet.class))
                        .or(ElementMatchers.is(java.util.LinkedHashSet.class))
                        .or(ElementMatchers.is(java.util.TreeSet.class)))
                .transform((builder, type, classLoader, module, protectionDomain) -> {
                    return builder.visit(Advice.to(IteratorInterceptor.CreatedInterceptor.class)
                            .on(named("iterator").and(takesArguments(0))));
                })
                .type(ElementMatchers.is(java.util.HashMap.class)
                        .or(ElementMatchers.is(java.util.LinkedHashMap.class))
                        .or(ElementMatchers.is(java.util.TreeMap.class)))
                .transform((builder, type, classLoader, module, protectionDomain) -> {
                    return builder
                            .visit(Advice.to(MapInterceptor.PutEnterInterceptor.class)
                                    .on(named("put").and(takesArguments(Object.class, Object.class))))
                            .visit(Advice.to(MapInterceptor.PutExitInterceptor.class)
                                    .on(named("put").and(takesArguments(Object.class, Object.class))))
                            .visit(Advice.to(MapInterceptor.GetInterceptor.class)
                                    .on(named("get").and(takesArguments(Object.class))))
                            .visit(Advice.to(MapInterceptor.RemoveInterceptor.class)
                                    .on(named("remove").and(takesArguments(Object.class))))
                            .visit(Advice.to(MapInterceptor.ClearInterceptor.class)
                                    .on(named("clear").and(takesArguments(0))))
                            .visit(Advice.to(MapInterceptor.GetInterceptor.class)
                                    .on(named("containsKey").and(takesArguments(Object.class))));
                }).type(ElementMatchers.is(java.util.Arrays.class))
                .transform((builder, type, classLoader, module, protectionDomain) -> {
                    return builder
                            .visit(Advice.to(ApiCallInterceptor.EnterInterceptor.class)
                                    .on(named("sort").or(named("fill"))))
                            .visit(Advice.to(ApiCallInterceptor.ExitInterceptor.class)
                                    .on(named("sort").or(named("fill"))));
                }).installOn(inst);

        System.err.println("[VisualizerAgent] Agent installed");
    }
}
