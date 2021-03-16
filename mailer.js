const nodemailer = require("nodemailer");
const dotenv = require('dotenv'); //Used for environment variables
dotenv.config();


async function sendEmail(body, subject){

    const transporter = nodemailer.createTransport({
        service: "Gmail",
        port: 587,
        secure: true, // use SSL
        auth: {
            user: process.env.CORREO_USER,
            pass: process.env.CORREO_PASSWORD
        }
    });

    const options = {
        from: process.env.USER_EMAIL,
        to: "elopez@logisti-k.com.mx",
        subject: subject,
        text: body.body
    }

    transporter.sendMail(options, function(err, information) {
        if(err)
            return console.log(err)

         console.log("El mensaje ha sido enviado con exito", information.response);   
    });
}


module.exports = {
    sendEmail
}
