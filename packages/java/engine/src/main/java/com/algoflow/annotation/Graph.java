package com.algoflow.annotation;

import java.lang.annotation.*;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface Graph {
    boolean directed() default false;
    boolean weighted() default false;
}
