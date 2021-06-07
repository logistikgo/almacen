const { authMirage } = require('../../../services/auth/auth');
const { createDateFormatForRequest } = require('./helpers');
const API_MIRAGE_OP = process.env.API_MIRAGE_OP;
const fetch = require('node-fetch');

//Constantes de operacion en la API WS de Mirage
const REQUEST_OPERATIONS_API_MIRAGE = {
    TRANSACCIONES_CONFIRMADAS: 1,
    TRANSACCIONES_PENDIENTES_CONFIRMAR: 2,
    INVENTARIO_ACTUAL: 3
}

async function requestToApiMirage(operation){

    const token = await authMirage();
    //createDateFormatForRequest()
    const operationBody = {
        "metodo": "ivk",
        "token": token.datos[0].token, 
        "params": {"opt": operation, "f": "20210526" }
    }

    const API_MIRAGE_RESPONSE = await fetch(API_MIRAGE_OP,  { method:'post',
                                                        body:JSON.stringify(operationBody),
                                                  headers: { 'Content-Type': 'application/json' } })
    const API_MIRAGE_RESPONSE_JSON = await API_MIRAGE_RESPONSE.json();

    return API_MIRAGE_RESPONSE_JSON
}


async function apiMirageOP1(CLASETRX){
   const { TRANSACCIONES_CONFIRMADAS } = REQUEST_OPERATIONS_API_MIRAGE; 
   const TRANSACCIONES_MIRAGE = await requestToApiMirage(TRANSACCIONES_CONFIRMADAS) 
   return TRANSACCIONES_MIRAGE.datos[0].Table.filter(TRANSACCIONES_MIRAGE => TRANSACCIONES_MIRAGE.CLASETRX === CLASETRX);     
}

async function apiMirageOP2(){
    const { TRANSACCIONES_PENDIENTES_CONFIRMAR } = REQUEST_OPERATIONS_API_MIRAGE; 
    const TRANSACCIONES_PENDIENTES_CONFIRMAR_JSON = await requestToApiMirage(TRANSACCIONES_PENDIENTES_CONFIRMAR) 
    return TRANSACCIONES_PENDIENTES_CONFIRMAR_JSON;     
 }
 
 async function apiMirageOP3(){
    const { INVENTARIO_ACTUAL } = REQUEST_OPERATIONS_API_MIRAGE; 
    const INVENTARIO_ACTUAL_JSON = await requestToApiMirage(INVENTARIO_ACTUAL) 
    return INVENTARIO_ACTUAL_JSON;     
 }
 
async function movimientosEntradasMirage(){
    const entradasMirage = await apiMirageOP1("SALIDA");
    return entradasMirage;
}

async function movimientosSalidasMirage(){
    const salidasMirage = await apiMirageOP1("SALIDA");
    return salidasMirage;
}

module.exports = {
    movimientosEntradasMirage,
    movimientosSalidasMirage
}