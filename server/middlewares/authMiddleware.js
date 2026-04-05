export const  protect = async(req,res,next)=>{
  try{
    const {userId} = await req.auth()

    if(!userId){
      return res.status(401).json({message: "unauthorised"})
    }
    console.log("User authorised")
    return next()
  }
  catch(err){
    console.log(err)
    return res.status(401).json({
      message: err.code || err.message
    })
  }
}