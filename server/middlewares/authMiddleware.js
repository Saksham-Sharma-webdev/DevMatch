export const  protect = async(req,res,next)=>{
  try{
    const {userId} = req.auth()

    if(!userId){
      return res.status(401).json({message: "unauthorised"})
    }
    return next9
  }
  catch(err){
    console.log(err)
    return res.status(401).json({
      message: err.code || err.message
    })
  }
}