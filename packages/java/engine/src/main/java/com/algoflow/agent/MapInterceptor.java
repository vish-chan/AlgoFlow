package com.algoflow.agent;

import net.bytebuddy.asm.Advice;

public class MapInterceptor {

    static class PutEnterInterceptor {
        @Advice.OnMethodEnter
        static void onPutBefore(@Advice.This Object instance, @Advice.Argument(0) Object key,
                @Advice.Argument(1) Object value) {
            VisualizerBridge.mapPutListener.accept(instance, new Object[]{key, value, "before"});
        }
    }

    static class PutExitInterceptor {
        @Advice.OnMethodExit
        static void onPutAfter(@Advice.This Object instance, @Advice.Argument(0) Object key,
                @Advice.Argument(1) Object value) {
            VisualizerBridge.mapPutListener.accept(instance, new Object[]{key, value, "after"});
        }
    }

    static class GetInterceptor {
        @Advice.OnMethodExit
        static void onGet(@Advice.This Object instance, @Advice.Argument(0) Object key) {
            VisualizerBridge.mapGetListener.accept(instance, new Object[]{key});
        }
    }

    static class RemoveInterceptor {
        @Advice.OnMethodEnter
        static void onRemoveBefore(@Advice.This Object instance, @Advice.Argument(0) Object key) {
            VisualizerBridge.mapRemoveListener.accept(instance, new Object[]{key, "before"});
        }

        @Advice.OnMethodExit
        static void onRemoveAfter(@Advice.This Object instance, @Advice.Argument(0) Object key) {
            VisualizerBridge.mapRemoveListener.accept(instance, new Object[]{key, "after"});
        }
    }

    static class ClearInterceptor {
        @Advice.OnMethodExit
        static void onClear(@Advice.This Object instance) {
            VisualizerBridge.mapClearListener.accept(instance);
        }
    }
}
