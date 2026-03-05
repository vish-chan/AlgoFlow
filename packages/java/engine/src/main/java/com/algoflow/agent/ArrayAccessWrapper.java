package com.algoflow.agent;

import net.bytebuddy.asm.AsmVisitorWrapper;
import net.bytebuddy.description.field.FieldDescription;
import net.bytebuddy.description.field.FieldList;
import net.bytebuddy.description.method.MethodList;
import net.bytebuddy.description.type.TypeDescription;
import net.bytebuddy.implementation.Implementation;
import net.bytebuddy.jar.asm.ClassVisitor;
import net.bytebuddy.jar.asm.ClassWriter;
import net.bytebuddy.jar.asm.MethodVisitor;
import net.bytebuddy.jar.asm.Opcodes;
import net.bytebuddy.pool.TypePool;

public class ArrayAccessWrapper implements AsmVisitorWrapper {

    @Override
    public int mergeWriter(int flags) {
        return flags | ClassWriter.COMPUTE_MAXS | ClassWriter.COMPUTE_FRAMES;
    }

    @Override
    public int mergeReader(int flags) {
        return flags;
    }

    @Override
    public ClassVisitor wrap(TypeDescription instrumentedType,
                            ClassVisitor classVisitor,
                            Implementation.Context implementationContext,
                            TypePool typePool,
                            FieldList<FieldDescription.InDefinedShape> fields,
                            MethodList<?> methods,
                            int writerFlags,
                            int readerFlags) {
        return new ArrayAccessClassVisitor(classVisitor);
    }

    private static class ArrayAccessClassVisitor extends ClassVisitor {
        public ArrayAccessClassVisitor(ClassVisitor cv) {
            super(Opcodes.ASM9, cv);
        }

        @Override
        public MethodVisitor visitMethod(int access, String name, String descriptor,
                                         String signature, String[] exceptions) {
            MethodVisitor mv = super.visitMethod(access, name, descriptor, signature, exceptions);
            return new ArrayAccessMethodVisitor(mv);
        }
    }

    private static class ArrayAccessMethodVisitor extends MethodVisitor {
        private boolean injectingCode = false;

        public ArrayAccessMethodVisitor(MethodVisitor mv) {
            super(Opcodes.ASM9, mv);
        }

        @Override
        public void visitInsn(int opcode) {
            if (injectingCode) {
                super.visitInsn(opcode);
                return;
            }

            if (opcode >= Opcodes.IALOAD && opcode <= Opcodes.SALOAD) {
                injectArrayRead(opcode);
            }
            else if (opcode >= Opcodes.IASTORE && opcode <= Opcodes.SASTORE) {
                injectArrayWrite(opcode);
            }
            else {
                super.visitInsn(opcode);
            }
        }

        private void injectArrayRead(int opcode) {
            injectingCode = true;

            // Stack: [array, index]
            // Save to local variables
            int indexSlot = 100;
            int arraySlot = 101;

            super.visitVarInsn(Opcodes.ISTORE, indexSlot);
            super.visitVarInsn(Opcodes.ASTORE, arraySlot);

            // Create Object[1] with index
            super.visitInsn(Opcodes.ICONST_1);
            super.visitTypeInsn(Opcodes.ANEWARRAY, "java/lang/Object");
            super.visitInsn(Opcodes.DUP);
            super.visitInsn(Opcodes.ICONST_0);
            super.visitVarInsn(Opcodes.ILOAD, indexSlot);
            super.visitMethodInsn(Opcodes.INVOKESTATIC, "java/lang/Integer", "valueOf", "(I)Ljava/lang/Integer;", false);
            super.visitInsn(Opcodes.AASTORE);

            // Call onArraySet(array, Object[])
            super.visitVarInsn(Opcodes.ALOAD, arraySlot);
            super.visitInsn(Opcodes.SWAP);
            super.visitMethodInsn(Opcodes.INVOKESTATIC,
                    "com/algoflow/visualiser/VisualizerRegistry",
                    "onArrayGet",
                    "(Ljava/lang/Object;[Ljava/lang/Object;)V",
                    false);

            // Execute original load
            super.visitVarInsn(Opcodes.ALOAD, arraySlot);
            super.visitVarInsn(Opcodes.ILOAD, indexSlot);
            super.visitInsn(opcode);
            injectingCode = false;
        }

        private void injectArrayWrite(int opcode) {
            injectingCode = true;
            
            // Stack: [array, index, value]
            // Save to local variables
            int valueSlot = 100;
            int indexSlot = 101;
            int arraySlot = 102;
            
            storeValue(opcode, valueSlot);
            super.visitVarInsn(Opcodes.ISTORE, indexSlot);
            super.visitVarInsn(Opcodes.ASTORE, arraySlot);
            
            // Create Object[2] with index and value
            super.visitInsn(Opcodes.ICONST_2);
            super.visitTypeInsn(Opcodes.ANEWARRAY, "java/lang/Object");
            super.visitInsn(Opcodes.DUP);
            super.visitInsn(Opcodes.ICONST_0);
            super.visitVarInsn(Opcodes.ILOAD, indexSlot);
            super.visitMethodInsn(Opcodes.INVOKESTATIC, "java/lang/Integer", "valueOf", "(I)Ljava/lang/Integer;", false);
            super.visitInsn(Opcodes.AASTORE);
            super.visitInsn(Opcodes.DUP);
            super.visitInsn(Opcodes.ICONST_1);
            loadValue(opcode, valueSlot);
            boxIfNeeded(opcode);
            super.visitInsn(Opcodes.AASTORE);
            
            // Call onArraySet(array, Object[])
            super.visitVarInsn(Opcodes.ALOAD, arraySlot);
            super.visitInsn(Opcodes.SWAP);
            super.visitMethodInsn(Opcodes.INVOKESTATIC,
                "com/algoflow/visualiser/VisualizerRegistry",
                "onArraySet",
                "(Ljava/lang/Object;[Ljava/lang/Object;)V",
                false);
            
            // Restore and execute original store
            super.visitVarInsn(Opcodes.ALOAD, arraySlot);
            super.visitVarInsn(Opcodes.ILOAD, indexSlot);
            loadValue(opcode, valueSlot);
            super.visitInsn(opcode);
            
            injectingCode = false;
        }
        
        private void storeValue(int opcode, int slot) {
            switch (opcode) {
                case Opcodes.IASTORE, Opcodes.BASTORE, Opcodes.CASTORE, Opcodes.SASTORE -> 
                    super.visitVarInsn(Opcodes.ISTORE, slot);
                case Opcodes.LASTORE -> super.visitVarInsn(Opcodes.LSTORE, slot);
                case Opcodes.FASTORE -> super.visitVarInsn(Opcodes.FSTORE, slot);
                case Opcodes.DASTORE -> super.visitVarInsn(Opcodes.DSTORE, slot);
                case Opcodes.AASTORE -> super.visitVarInsn(Opcodes.ASTORE, slot);
            }
        }
        
        private void loadValue(int opcode, int slot) {
            switch (opcode) {
                case Opcodes.IASTORE, Opcodes.BASTORE, Opcodes.CASTORE, Opcodes.SASTORE -> 
                    super.visitVarInsn(Opcodes.ILOAD, slot);
                case Opcodes.LASTORE -> super.visitVarInsn(Opcodes.LLOAD, slot);
                case Opcodes.FASTORE -> super.visitVarInsn(Opcodes.FLOAD, slot);
                case Opcodes.DASTORE -> super.visitVarInsn(Opcodes.DLOAD, slot);
                case Opcodes.AASTORE -> super.visitVarInsn(Opcodes.ALOAD, slot);
            }
        }

        private void boxIfNeeded(int opcode) {
            switch (opcode) {
                case Opcodes.IALOAD, Opcodes.IASTORE, Opcodes.BALOAD, Opcodes.BASTORE, 
                     Opcodes.CALOAD, Opcodes.CASTORE, Opcodes.SALOAD, Opcodes.SASTORE -> 
                    super.visitMethodInsn(Opcodes.INVOKESTATIC, "java/lang/Integer", "valueOf", "(I)Ljava/lang/Integer;", false);
                case Opcodes.LALOAD, Opcodes.LASTORE -> 
                    super.visitMethodInsn(Opcodes.INVOKESTATIC, "java/lang/Long", "valueOf", "(J)Ljava/lang/Long;", false);
                case Opcodes.FALOAD, Opcodes.FASTORE -> 
                    super.visitMethodInsn(Opcodes.INVOKESTATIC, "java/lang/Float", "valueOf", "(F)Ljava/lang/Float;", false);
                case Opcodes.DALOAD, Opcodes.DASTORE -> 
                    super.visitMethodInsn(Opcodes.INVOKESTATIC, "java/lang/Double", "valueOf", "(D)Ljava/lang/Double;", false);
            }
        }
    }
}
