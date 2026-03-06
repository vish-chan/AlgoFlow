package com.algoflow.agent;

import net.bytebuddy.asm.Advice;

public class CollectionInterceptor {

    static class AddInterceptor {
        @Advice.OnMethodExit
        static void onAdd(
                @Advice.This Object instance,
                @Advice.AllArguments Object[] args
        ) {
            VisualizerBridge.addListener.accept(instance, args);
        }
    }

    static class RemoveInterceptor {
        @Advice.OnMethodExit
        static void onRemove(
                @Advice.This Object instance,
                @Advice.AllArguments Object[] args
        ) {
            VisualizerBridge.removeListener.accept(instance, args);
        }
    }

    static class ClearInterceptor {
        @Advice.OnMethodExit
        static void onClear(@Advice.This Object instance) {
            VisualizerBridge.clearListener.accept(instance);
        }
    }
}
