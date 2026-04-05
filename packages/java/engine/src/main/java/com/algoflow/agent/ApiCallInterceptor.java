package com.algoflow.agent;

import net.bytebuddy.asm.Advice;

public class ApiCallInterceptor {

    static class EnterInterceptor {
        @Advice.OnMethodEnter
        static void onEnter() {
            VisualizerBridge.apiCallDepth++;
        }
    }

    static class ExitInterceptor {
        @Advice.OnMethodExit
        static void onExit(@Advice.Argument(0) Object target) {
            int depth = --VisualizerBridge.apiCallDepth;
            if (depth == 0 && VisualizerBridge.apiMutateListener != null)
                VisualizerBridge.apiMutateListener.accept(target);
        }
    }
}
