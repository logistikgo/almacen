const API_UUID = process.env.UUID_API;
const API_MIRAGE_AUTH = process.env.API_MIRAGE_AUTH
const { v4 : uuid } = require('uuid');
const fetch = require('node-fetch');

async function generateUUID(){

    const response = await fetch(API_UUID)
    const responseTextUUID = await response.text();
    return responseTextUUID;
}

async function authMirage(){

    const API_KEY_MIRAGE = process.env.API_KEY_MIRAGE
    const SESION_UUID = uuid();

    const authBody = {
        "apikey": API_KEY_MIRAGE, 
        "sesion": SESION_UUID
    }

    const authMirageResponse = await fetch(API_MIRAGE_AUTH, 
                                            { method: 'post',
                                              body:    JSON.stringify(authBody),
                                              headers: { 'Content-Type': 'application/json' } })
    const authMirageResponseJson = await authMirageResponse.json();  

    return authMirageResponseJson

}


module.exports = {
    generateUUID,
    authMirage
}


