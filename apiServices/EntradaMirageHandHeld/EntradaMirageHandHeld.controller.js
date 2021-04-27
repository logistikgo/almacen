'use strict'
const mongoose = require('mongoose');
const Entrada = require('../Entradas/Entrada.model');
const Producto = require('../Producto/Producto.model');
const Salida = require('../Salidas/Salida.model');
const Partida = require('../Partida/Partida.controller');
const PasilloCtr = require('../Pasillos/Pasillo.controller');
const EmbalajesController = require('../Embalaje/Embalaje.controller');
const PartidaModel = require('../Partida/Partida.model');
const ClienteFiscal = require('../ClientesFiscales/ClienteFiscal.model');
const Helper = require('../../services/utils/helpers');
const MovimientoInventario = require('../MovimientosInventario/MovimientoInventario.controller');
const MovimientoInventarioModel = require('../MovimientosInventario/MovimientoInventario.model');
const Interfaz_ALM_XD = require('../Interfaz_ALM_XD/Interfaz_ALM_XD.controller');
const TiempoCargaDescarga = require('../TiempoCargaDescarga/TiempoCargaDescarga.controller');
const PlantaProductora = require('../PlantaProductora/PlantaProductora.model'); 
const dateFormat = require('dateformat');
const Ticket = require('../Ticket/Ticket.model');

const { formatPosicion, createDateForForPartida } = require('./utils/helpers')
const { apiMirageOP1, apiMirageOP2, apiMirageOP3 } = require('./utils/MirageRequest.repository');
function getNextID() {
	return Helper.getNextID(Entrada, "idEntrada");
}


async function entradaMirageHandHeld(req, res){

/* 
    res.status(200).send({statusCode: 200, 
        response: `Te has autenticado a Mirage con el Token ${SESION_UUID}`, 
        data: authMirageResponseJson})
 */
    //Se obtiene el token diractamente del WS de Mirage
   
    const CLIENTE_FISCAL_ID = "6074a7d60e45340e283a4b27";
    const ALMACEN_ID = "6074a91b0e45340e283a4b28";
    const SUCURSAL_ID = "5e3342f322b5651aecafea05"    
    
    const ENTRADA_MIRAGE_JSON = await apiMirageOP1();
    //const SALIDA_MIRAGE_JSON = await apiMirageOP2();
    //const INVENTARIO_MIRAGE_JSON = await apiMirageOP3();
    let partidasMirage = [];
    const datosTable = ENTRADA_MIRAGE_JSON.datos[0].Table;    

        for (let dato of datosTable) {
            const { ARTICULO, DOCUMENTO, LOCACION, QTY, TRXID, FECHACONFIRM, USUARIO, LICENCIA } = dato;

            const producto = await Producto.findOne({clave: ARTICULO}).exec();

            const posicion = await formatPosicion(LOCACION, ALMACEN_ID);

            posicion.embalajesEntrada = { unidades: 1},
            posicion.embalajesxSalir = { unidades: 1}

            const fecha = createDateForForPartida(FECHACONFIRM);
            let currentQuantity = QTY;
            

            while(currentQuantity > 0){
                const data={
                    producto_id:producto?._id,
                    clave:producto?.clave,
                    descripcion:producto?.descripcion,
                    origen:"MIRAGE-HANDHELD", // Origen de la informacion,
                    tipo: "NORMAL",
                    status: "ASIGNADA",
                    embalajesEntrada: { 
                        unidades: QTY}, //Los embalajes seran Unidades,
                    embalajesxSalir: { 
                        unidades: QTY
                    },
                    InfoPedidos:[{ "IDAlmacen": req.body.IdAlmacen}],
                    valor:0,
                    posiciones: [
                        posicion
                    ]
                }   
                currentQuantity--;
                partidasMirage.push(data);
            } 
                    console.log(dato);
                }

 


    /* 
        Modelo de la partida
        {
        producto_id: { type: Schema.ObjectId, ref: 'Producto' },
        clave: String ARTICULO,
        descripcion: String ITEMDESC,
        entrada_id: { type: Schema.ObjectId, ref: 'Entrada' },
        salidas_id:
            [
                {
                    salida_id: { type: Schema.ObjectId, ref: 'Salida' },
                    embalajes: {},
                    salidaxPosiciones: [{
                        embalajes: {},
                        posicion_id: { type: Schema.ObjectId, ref: 'Posicion' },
                        posicion: String,
                        pasillo_id: { type: Schema.ObjectId, ref: 'Pasillo' },
                        pasillo: String,
                        nivel_id: { type: Schema.ObjectId },
                        nivel: String
                    }]
                }
            ],
        posiciones: [
            {
                embalajesEntrada: {},
                embalajesxSalir: {},
                posicion_id: { type: Schema.ObjectId, ref: 'Posicion' },
                posicion: String,
                pasillo_id: { type: Schema.ObjectId, ref: 'Pasillo' },
                pasillo: String,
                nivel_id: { type: Schema.ObjectId },
                nivel: String,
                isEmpty: { type: Boolean, default: false }
            }
        ],
        embalajesEntrada: {},
        embalajesxSalir: {},
        embalajesAlmacen: {},
        referenciaPedidos:[{
            referenciaPedido: String,
            CajasPedidas: {},
            pedido: {type: Boolean, default: false}
        }],
        CajasPedidas: {},
        isEmpty: { type: Boolean, default: false },
        origen: { type: String, default: "ALM" },
        tipo: { type: String, default: "NORMAL" },
        status: { type: String, default: "ASIGNADA" },
        isExtraordinaria: { type: Boolean, default: false },
        pedido:{type:Boolean,default:false},
        refpedido:{type:String, default: "SIN_ASIGNAR"},
        statusPedido:{type:String, default: "SIN_ASIGNAR"},
        indexpedido: { type: Schema.ObjectId },//no se ocupa
        saneado:{ type: Boolean, default: false },
    },
    */

    /*
        Modelo de la Entrada
    {
		idEntrada: Number,
		almacen_id: { type: Schema.ObjectId, ref: "Almacen" },
		sucursal_id: { type: Schema.ObjectId, ref: 'Sucursal' },
		clienteFiscal_id: { type: Schema.ObjectId, ref: 'ClienteFiscal' },
		folio: String,
		stringFolio: String,
		item: String Aqui puede ir la licencia,
		tipo: String El tipo por defecto sera asignada,
		embarque: String Seria un identificador unico de la licencia,
		referencia: Aqui puede ir la licencia,
		acuse: String,
		proveedor: String El Proveedor de quien surtio la mercancia,
		ordenCompra: String Este es un dato de la orden de compra, que viene en la informacion de la licencia,
		factura: String El numero de factura,
		transportista: String El trasnportista que trae el contenedor,
		operador: String,
		unidad: String,
		tracto: String,
		remolque: String,
		sello: String,
		plantaOrigen: String,
		tiempoDescarga_id: { type: Schema.ObjectId, ref: "TiempoCargaDescarga" },
		fechaEntrada: Date,
		fechaReciboRemision: Date,
		fechaSalidaPlanta: Date,
		fechaEsperada:Date,
		observaciones: String,
		valor: Number,
		partidas: [
			{
				type: Schema.ObjectId,
				ref: 'Partida'
			}
		],
		salidas_id: [
			{
				type: Schema.ObjectId,
				ref: 'Salida'
			}
		],
		recibio: String,
		status: String por defecto sera false,
		fechaAlta: { type: Date, default: Date.now },
		usuarioAlta_id: Number,
		nombreUsuario: String,
		usuarioEdita_id: Number,
		isEmpty: { type: Boolean, default: false },
        DiasTraslado: Number
	
	}
);    
 */

	//console.log(fechaesperada.toString())
    /*
    let nEntrada = new Entrada();
    nEntrada.fechaEntrada = new Date(FECHACONFIRM);
    nEntrada.almacen_id=mongoose.Types.ObjectId(ALMACEN_ID);
    nEntrada.clienteFiscal_id = idCliente;
    nEntrada.sucursal_id = idSucursales;
    nEntrada.status = "APLICADA";/*repalce arrival
    nEntrada.tipo = "NORMAL";
    nEntrada.partidas = partidas.map(x => x._id) //Obtener los ids de las partidas;
    nEntrada.nombreUsuario = "MIRAGE HANDHELD";
    nEntrada.tracto = noOrden.trailer;			
    nEntrada.referencia = noOrden.factura;
    nEntrada.factura = noOrden.factura;
    nEntrada.item = noOrden.factura;
    nEntrada.transportista = noOrden.transportista;
    nEntrada.operador = noOrden.chofer;
    nEntrada.sello=noOrden.sello;
    nEntrada.ordenCompra=noOrden.po;
    nEntrada.fechaAlta = new Date(FECHACONFIRM);
    nEntrada.idEntrada = await getNextID();
    nEntrada.folio = await getNextID();
     
    nEntrada.stringFolio = await Helper.getStringFolio(nEntrada.folio, nEntrada.clienteFiscal_id, 'I', false);
    
    nEntrada.fechaSalidaPlanta = new Date(fechaSalidaPlanta);
    //console.log("testEntrada");
    */

    //return res.status(200).send({statusCode: 200, response: {message: "OK", token: token, data }});
    
    return res.status(200).send({statusCode: 200, response: {message: "OK", partidasMirage, ENTRADA_MIRAGE_JSON}});

}

module.exports = {
    entradaMirageHandHeld
}
