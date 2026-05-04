package com.example.tokis.client;

import com.example.tokis.model.QueryResponse;
import com.example.tokis.model.SnippetDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;


@Service
public class WorkerClient{
    public final RestTemplate restTemplate;

    public WorkerClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<SnippetDTO> getSnippets(String query,List<String> files){
        String url="http://localhost:8002/query";
        Map<String,Object> request=new HashMap<>();
        request.put("query",query);
        request.put("files",files);

        ResponseEntity<QueryResponse> response=restTemplate.postForEntity(url,request,QueryResponse.class);
        assert response.getBody() != null;
        return response.getBody().getSnippets();

    }
    
}