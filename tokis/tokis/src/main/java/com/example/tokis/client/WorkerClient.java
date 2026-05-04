package com.example.tokis.client;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;



@Service
public class WorkerClient{
    public RestTemplate restTemplate;

    public WorkerCLient(RestTemplate restTemplate){
        this.restTemplate=restTemplate;
    }

    
}