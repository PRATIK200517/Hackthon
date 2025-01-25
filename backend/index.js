import express from "express";

const app=express();

app.get("/",(req,res)=>{
    console.log("hello world");
})

app.listen(3000,()=>{
    console.log("sever is listening on poet 3000")
})

export default app;