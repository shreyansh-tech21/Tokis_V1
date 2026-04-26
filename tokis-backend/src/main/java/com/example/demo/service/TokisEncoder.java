package com.example.demo.service;

import org.springframework.stereotype.Service;

import com.example.demo.model.Transformation;

@Service
public class TokisEncoder {

    public Transformation encode(String rawInput){
        String intentPart=extractIntent(rawInput);
        String payloadPart=extractPayload(rawInput,intentPart);
        String symbol=mapToSymbol(intentPart);
        String compressed=symbol+" "+payloadPart;

        Transformation t= new Transformation();
        t.setOriginalPrompt(rawInput);
        t.setCompressedPrompt(compressed);
        t.setTokensSaved(calculateSavings(rawInput,compressed));
        return t;

    }
    private String mapToSymbol(String intent){
        if(intent.toLowerCase().contains("check") || intent.contains("fix"))return "@";
        if(intent.toLowerCase().contains("explain"))return "?";
        return "[no-op]";
    }

    private String extractIntent(String input){
        return input.split("\\.")[0];
    }

    private String extractPayload(String input,String intent){
        return input.replace(intent,"").trim();
    }
    private int calculateSavings(String original,String compressed){
        return (original.length()-compressed.length())/4;
    }
    
}
