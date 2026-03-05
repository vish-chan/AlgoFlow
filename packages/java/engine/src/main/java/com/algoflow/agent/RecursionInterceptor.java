package com.algoflow.agent;

import com.algoflow.visualiser.VisualizerRegistry;
import net.bytebuddy.asm.Advice;
import net.bytebuddy.implementation.bytecode.assign.Assigner;

public class RecursionInterceptor {
    
    static class EnterInterceptor {
        @Advice.OnMethodEnter
        static void onEnter(
                @Advice.Origin("#m") String methodName,
                @Advice.AllArguments Object[] args
        ) {
            VisualizerRegistry.onRecursionEnter(methodName, args);
        }
    }
    
    static class ExitInterceptor {
        @Advice.OnMethodExit
        static void onExit(
                @Advice.Origin("#m") String methodName,
                @Advice.Return(typing = Assigner.Typing.DYNAMIC) Object result
        ) {
            VisualizerRegistry.onRecursionExit(methodName, result);
        }
    }
}
