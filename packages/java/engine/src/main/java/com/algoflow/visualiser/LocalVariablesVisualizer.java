package com.algoflow.visualiser;

import org.algorithm_visualizer.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class LocalVariablesVisualizer implements Visualizer {
    
    private final Array2DTracer _tracer;
    private final String[] _variableNames;
    private final Map<String, Object> _variableValues = new LinkedHashMap<>();
    private static final Map<String, Map<Integer, String>> slotNameRegistry = new ConcurrentHashMap<>();
    
    public LocalVariablesVisualizer(String name, String[] variableNames) {
        this._tracer = new Array2DTracer(name);
        this._variableNames = variableNames;
        
        // Initialize all variables with null
        for (String varName : variableNames) {
            _variableValues.put(varName, null);
        }
    }
    
    public static void registerSlotName(String methodName, int slot, String name) {
        slotNameRegistry.computeIfAbsent(methodName, k -> new ConcurrentHashMap<>()).put(slot, name);
    }
    
    public static String getSlotName(String methodName, int slot) {
        return slotNameRegistry.getOrDefault(methodName, Map.of()).getOrDefault(slot, "slot_" + slot);
    }
    
    public void onVariableUpdate(String variableName, Object value) {
        // Only update if this variable is in our tracked list
        if (_variableValues.containsKey(variableName)) {
            _variableValues.put(variableName, value);
            updateDisplay(variableName);
        }
    }
    
    private void updateDisplay(String variableName) {
        Object[][] grid = new Object[_variableNames.length][2];
        int patchedRow = -1;

        for (int i = 0; i < _variableNames.length; i++) {
            grid[i][0] = _variableNames[i];
            grid[i][1] = _variableValues.get(_variableNames[i]);
            if (_variableNames[i].equals(variableName)) {
                patchedRow = i;
            }
        }
        
        _tracer.set(grid);
        _tracer.patch(patchedRow, 1);
        Tracer.delay();
        _tracer.depatch(patchedRow, 1);
    }
    
    @Override
    public Commander getCommander() {
        return _tracer;
    }
}
