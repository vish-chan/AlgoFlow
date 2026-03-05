package com.algoflow.agent;

import net.bytebuddy.asm.Advice;

public class ListInterceptor {
    static class GetInterceptor {
        @Advice.OnMethodExit
        static void onGet(
                @Advice.This Object instance,
                @Advice.Origin("#m") String methodName,
                @Advice.Argument(0) int index
        ) {
           VisualizerBridge.getListener.accept(instance, new Object[]{index});
        }
    }

    static class SetInterceptor {
        @Advice.OnMethodExit
        static void onSet(
                @Advice.This Object instance,
                @Advice.Origin("#m") String methodName,
                @Advice.Argument(0) int index,
                @Advice.Argument(1) Object value
        ) {
            VisualizerBridge.setListener.accept(instance, new Object[]{index, value});
        }
    }

    static class AddInterceptor {
        @Advice.OnMethodExit
        static void onAdd(
                @Advice.This Object instance,
                @Advice.AllArguments Object[] args
        ) {
            VisualizerBridge.addListener.accept(instance, args);
        }
    }

    static class ClearInterceptor {
        @Advice.OnMethodExit
        static void onClear(@Advice.This Object instance) {
            VisualizerBridge.clearListener.accept(instance);
        }
    }
}
