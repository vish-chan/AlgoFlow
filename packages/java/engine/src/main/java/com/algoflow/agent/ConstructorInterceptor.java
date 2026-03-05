package com.algoflow.agent;

import com.algoflow.visualiser.VisualizerInitializer;
import net.bytebuddy.asm.Advice;

public class ConstructorInterceptor {
    
    @Advice.OnMethodExit
    public static void onConstructorExit(@Advice.This Object instance) {
        if (instance != null && instance.getClass().getName().startsWith("com.algoflow.runner")) {
            VisualizerInitializer.autoScan(instance);
        }
    }
}
