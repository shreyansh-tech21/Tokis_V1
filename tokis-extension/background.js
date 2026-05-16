chrome.runtime.onMessage.addListener(
    async (request,sender,sendResponse)=>{
        if(request.type==="GET_REPOS"){
            try{
                const response=await fetch("http://localhost:8080/repos");
                const data=await response.json();
                sendResponse(data);
            }catch(e){
                sendResponse({
                    error:e.message
                });
            }
        }
        return true;
    }
)