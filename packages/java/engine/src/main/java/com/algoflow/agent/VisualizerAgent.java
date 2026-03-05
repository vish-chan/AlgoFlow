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

    public static void premain(String args, Instrumentation inst) throws IOException, NoSuchFieldException, IllegalAccessException, InstantiationException, NoSuchMethodException, InvocationTargetException {

        System.out.println("[VisualizerAgent] Starting agent...");
        File temp = Files.createTempDirectory("temp").toFile();

        // 1. INJECT into Bootstrap
        var result = ClassInjector.UsingInstrumentation.of(temp, ClassInjector.UsingInstrumentation.Target.BOOTSTRAP, inst)
                .inject(Map.of(
                        new TypeDescription.ForLoadedType(VisualizerBridge.class), ClassFileLocator.ForClassLoader.read(VisualizerBridge.class)
                ));

        // We get the CLASS object that belongs to the Bootstrap loader
        Class<?> bootBridge = result.get(new TypeDescription.ForLoadedType(VisualizerBridge.class));

        BiConsumer<Object, Object[]> onGet = VisualizerRegistry::onGet;
        BiConsumer<Object, Object[]> onSet = VisualizerRegistry::onSet;
        BiConsumer<Object, Object[]> onAdd = VisualizerRegistry::onAdd;
        Consumer<Object> onClear = VisualizerRegistry::onClear;
        Consumer<String> onLog = VisualizerRegistry::onLog;

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
        
        Field logListener = bootBridge.getField("logListener");
        logListener.setAccessible(true);
        logListener.set(null, onLog);

        new AgentBuilder.Default()
                .disableClassFormatChanges()
                .with(RETRANSFORMATION)
                // Make sure we see helpful logs
                .with(AgentBuilder.RedefinitionStrategy.Listener.StreamWriting.toSystemError())
                .with(AgentBuilder.Listener.StreamWriting.toSystemError().withTransformationsOnly())
                .with(AgentBuilder.InstallationListener.StreamWriting.toSystemError())
                // Ignore Byte Buddy and JDK classes we are not interested in
                .ignore(
                        nameStartsWith("net.bytebuddy.")
                                .or(nameStartsWith("jdk.internal.reflect."))
                                .or(nameStartsWith("java.lang.invoke."))
                                .or(nameStartsWith("com.sun.proxy."))
                )
                .with(AgentBuilder.InitializationStrategy.NoOp.INSTANCE)
                .type(nameStartsWith("com.algoflow.runner"))
                .transform((builder, type, classLoader, module, protectionDomain) -> {
                    System.out.println("[VisualizerAgent] Scanning for @Visualize and @TrackRecursion: " + type.getName());
                    return builder
                            .visit(Advice.to(ConstructorInterceptor.class)
                                    .on(isConstructor()))
                            .visit(Advice.to(RecursionInterceptor.EnterInterceptor.class)
                                    .on(isAnnotatedWith(named("com.algoflow.annotation.TrackRecursion"))))
                            .visit(Advice.to(RecursionInterceptor.ExitInterceptor.class)
                                    .on(isAnnotatedWith(named("com.algoflow.annotation.TrackRecursion"))))
                            .visit(new LocalVariableTrackerWrapper())
                            .visit(new ArrayAccessWrapper());
                })
                .type(ElementMatchers.is(java.util.ArrayList.class).or(ElementMatchers.is(LinkedList.class)))
                .transform((builder, type, classLoader, module, protectionDomain) -> {
                    System.out.println("[VisualizerAgent] Transforming: " + type.getName());
                    return builder
                            .visit(Advice.to(ListInterceptor.GetInterceptor.class)
                                    .on(named("get").and(takesArguments(int.class))))
                            .visit(Advice.to(ListInterceptor.SetInterceptor.class)
                                    .on(named("set").and(takesArguments(int.class, Object.class))))
                            .visit(Advice.to(ListInterceptor.AddInterceptor.class)
                                    .on(named("add")))
                            .visit(Advice.to(ListInterceptor.ClearInterceptor.class)
                                    .on(named("clear").and(takesArguments(0))));
                })
                .type(ElementMatchers.is(java.io.PrintStream.class))
                .transform((builder, type, classLoader, module, protectionDomain) -> {
                    System.out.println("[VisualizerAgent] Transforming PrintStream");
                    return builder
                            .visit(Advice.to(PrintStreamInterceptor.class)
                                    .on(named("println").and(takesArguments(String.class))));
                }).installOn(inst);

        System.out.println("[VisualizerAgent] Agent installed");
    }
}
