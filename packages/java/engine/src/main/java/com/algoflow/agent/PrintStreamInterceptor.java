package com.algoflow.agent;

import net.bytebuddy.asm.Advice;

public class PrintStreamInterceptor {
    
    @Advice.OnMethodEnter
    public static void onPrintln(@Advice.Argument(0) Object message) {
        VisualizerBridge.logListener.accept(String.valueOf(message));
    }
}
