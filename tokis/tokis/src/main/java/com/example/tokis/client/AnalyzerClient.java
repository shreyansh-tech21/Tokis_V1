package com.example.tokis.client;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AnalyzerClient {
    private final RestTemplate restTemplate;

    public AnalyzerClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<String> ingestRepo(String path){
        String url="http://127.0.0.1:8001/ingest";
        Map<String,String>request=new HashMap<>();
        request.put("path",path);

        Map<String,Object> response=restTemplate.postForObject(url,request,Map.class);
        List<String> fs= (List<String>) response.get("files");
        return fs;
    }

}
