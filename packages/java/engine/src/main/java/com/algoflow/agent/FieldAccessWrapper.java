package com.algoflow.agent;

import net.bytebuddy.asm.AsmVisitorWrapper;
import net.bytebuddy.description.field.FieldDescription;
import net.bytebuddy.description.field.FieldList;
import net.bytebuddy.description.method.MethodList;
import net.bytebuddy.description.type.TypeDescription;
import net.bytebuddy.implementation.Implementation;
import net.bytebuddy.jar.asm.*;
import net.bytebuddy.pool.TypePool;

public class FieldAccessWrapper implements AsmVisitorWrapper {

    @Override
    public int mergeWriter(int flags) {
        return flags | ClassWriter.COMPUTE_MAXS | ClassWriter.COMPUTE_FRAMES;
    }

    @Override
    public int mergeReader(int flags) {
        return flags;
    }

    @Override
    public ClassVisitor wrap(TypeDescription instrumentedType, ClassVisitor classVisitor,
            Implementation.Context implementationContext, TypePool typePool,
            FieldList<FieldDescription.InDefinedShape> fields, MethodList<?> methods, int writerFlags,
            int readerFlags) {
        return new FieldAccessClassVisitor(classVisitor);
    }

    private static class FieldAccessClassVisitor extends ClassVisitor {
        FieldAccessClassVisitor(ClassVisitor cv) {
            super(Opcodes.ASM9, cv);
        }

        @Override
        public MethodVisitor visitMethod(int access, String name, String descriptor, String signature,
                String[] exceptions) {
            MethodVisitor mv = super.visitMethod(access, name, descriptor, signature, exceptions);
            return new FieldAccessMethodVisitor(mv);
        }
    }

    private static class FieldAccessMethodVisitor extends MethodVisitor {
        private int currentLine = -1;

        FieldAccessMethodVisitor(MethodVisitor mv) {
            super(Opcodes.ASM9, mv);
        }

        @Override
        public void visitLineNumber(int line, Label start) {
            super.visitLineNumber(line, start);
            currentLine = line;
        }

        @Override
        public void visitFieldInsn(int opcode, String owner, String name, String descriptor) {
            if (opcode == Opcodes.GETFIELD && isObjectField(descriptor)) {
                // Stack: [objectref]
                int ownerSlot = 202;
                super.visitInsn(Opcodes.DUP);
                super.visitVarInsn(Opcodes.ASTORE, ownerSlot);
                super.visitFieldInsn(opcode, owner, name, descriptor);

                super.visitVarInsn(Opcodes.ALOAD, ownerSlot);
                super.visitLdcInsn(name);
                super.visitLdcInsn(currentLine);
                super.visitMethodInsn(Opcodes.INVOKESTATIC, "com/algoflow/visualiser/VisualizerRegistry",
                        "onFieldGet", "(Ljava/lang/Object;Ljava/lang/String;I)V", false);
                return;
            }
            if (opcode == Opcodes.GETFIELD && isPrimitiveField(descriptor)) {
                // Stack: [objectref]
                int ownerSlot = 203;
                super.visitInsn(Opcodes.DUP);
                super.visitVarInsn(Opcodes.ASTORE, ownerSlot);
                super.visitFieldInsn(opcode, owner, name, descriptor);

                super.visitVarInsn(Opcodes.ALOAD, ownerSlot);
                super.visitLdcInsn(name);
                super.visitLdcInsn(currentLine);
                super.visitMethodInsn(Opcodes.INVOKESTATIC, "com/algoflow/visualiser/VisualizerRegistry",
                        "onFieldGet", "(Ljava/lang/Object;Ljava/lang/String;I)V", false);
                return;
            }
            if (opcode == Opcodes.PUTFIELD && isObjectField(descriptor)) {
                // Stack: [objectref, newValue]
                int newValueSlot = 2000;
                int ownerSlot = 2001;

                super.visitVarInsn(Opcodes.ASTORE, newValueSlot);
                super.visitInsn(Opcodes.DUP);
                super.visitVarInsn(Opcodes.ASTORE, ownerSlot);
                super.visitVarInsn(Opcodes.ALOAD, newValueSlot);
                super.visitFieldInsn(opcode, owner, name, descriptor);

                // Call onFieldSet(owner, fieldName, lineNumber)
                super.visitVarInsn(Opcodes.ALOAD, ownerSlot);
                super.visitLdcInsn(name);
                super.visitLdcInsn(currentLine);
                super.visitMethodInsn(Opcodes.INVOKESTATIC, "com/algoflow/visualiser/VisualizerRegistry", "onFieldSet",
                        "(Ljava/lang/Object;Ljava/lang/String;I)V", false);
                return;
            }
            if (opcode == Opcodes.PUTFIELD && isPrimitiveField(descriptor)) {
                // Stack: [objectref, primitiveValue]
                int primSlot = 2002;
                // double and long take 2 slots
                boolean wide = descriptor.charAt(0) == 'J' || descriptor.charAt(0) == 'D';
                int ownerSlot = wide ? 2004 : 2003;

                storePrimitive(descriptor, primSlot);
                super.visitInsn(Opcodes.DUP);
                super.visitVarInsn(Opcodes.ASTORE, ownerSlot);
                loadPrimitive(descriptor, primSlot);
                super.visitFieldInsn(opcode, owner, name, descriptor);

                // Call onFieldSet(owner, fieldName, lineNumber)
                super.visitVarInsn(Opcodes.ALOAD, ownerSlot);
                super.visitLdcInsn(name);
                super.visitLdcInsn(currentLine);
                super.visitMethodInsn(Opcodes.INVOKESTATIC, "com/algoflow/visualiser/VisualizerRegistry", "onFieldSet",
                        "(Ljava/lang/Object;Ljava/lang/String;I)V", false);
                return;
            }
            if (opcode == Opcodes.PUTSTATIC && isObjectField(descriptor)) {
                // Stack: [newValue]
                super.visitFieldInsn(opcode, owner, name, descriptor);
                super.visitLdcInsn(owner.replace('/', '.'));
                super.visitLdcInsn(name);
                super.visitLdcInsn(currentLine);
                super.visitMethodInsn(Opcodes.INVOKESTATIC, "com/algoflow/visualiser/VisualizerRegistry",
                        "onStaticFieldSet", "(Ljava/lang/String;Ljava/lang/String;I)V", false);
                return;
            }
            super.visitFieldInsn(opcode, owner, name, descriptor);
        }

        private boolean isObjectField(String descriptor) {
            return descriptor.startsWith("L") || descriptor.startsWith("[");
        }

        private boolean isPrimitiveField(String descriptor) {
            return descriptor.length() == 1 && "IJFDZBCS".indexOf(descriptor.charAt(0)) >= 0;
        }

        private void storePrimitive(String descriptor, int slot) {
            switch (descriptor.charAt(0)) {
                case 'J' -> super.visitVarInsn(Opcodes.LSTORE, slot);
                case 'F' -> super.visitVarInsn(Opcodes.FSTORE, slot);
                case 'D' -> super.visitVarInsn(Opcodes.DSTORE, slot);
                default -> super.visitVarInsn(Opcodes.ISTORE, slot);
            }
        }

        private void loadPrimitive(String descriptor, int slot) {
            switch (descriptor.charAt(0)) {
                case 'J' -> super.visitVarInsn(Opcodes.LLOAD, slot);
                case 'F' -> super.visitVarInsn(Opcodes.FLOAD, slot);
                case 'D' -> super.visitVarInsn(Opcodes.DLOAD, slot);
                default -> super.visitVarInsn(Opcodes.ILOAD, slot);
            }
        }
    }
}
