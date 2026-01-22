function CAD(){

    // Cargar variables de entorno desde .env si existe
    try { require('dotenv').config(); } catch(_) {}

    const mongo=require("mongodb").MongoClient; 
    const ObjectId=require("mongodb").ObjectId;
    const { accessMONGOURI } = require('./gestorVariables.js');

    this.usuarios;
    this.logs;

    // Conectar a Mongo Atlas
    this.conectar=async function(callback){
        let cad=this;
        let uri = process.env.MONGO_URI;

        if (!uri) {
            try {
                uri = await accessMONGOURI();
            } catch (e) {
                console.error("No se pudo recuperar MONGO_URI de Secret Manager ni de .env");
            }
        }

        const dbName = process.env.MONGO_DB || 'sistema';

        if (!uri || typeof uri !== 'string' || uri.trim() === '') {
            console.error("Configuración de MongoDB ausente: define MONGO_URI en un archivo .env en la raíz del proyecto.");
            console.error("Ejemplo: MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/"+dbName+"?retryWrites=true&w=majority");
            throw new Error('MONGO_URI no está definido');
        }

        // Opciones prudentes para una selección de servidor más rápida en caso de fallo
        const client= new mongo(uri, { serverSelectionTimeoutMS: 10000 });

        try {
            await client.connect();
        } catch (err) {
            console.error('Error conectando a MongoDB. Revisa MONGO_URI y el acceso de red/IP en Atlas.');
            console.error(err && err.message ? err.message : err);
            throw err;
        }

        const database=client.db(dbName);
        cad.usuarios=database.collection("usuarios");
        cad.logs=database.collection("logs");
        // Índice único por email para prevenir duplicados
        try { await cad.usuarios.createIndex({ email: 1 }, { unique: true }); } catch (e) {}
        if (typeof callback === 'function') {
            callback(database);
        }
    }

    this.buscarOCrearUsuario=function(usr,callback){
        buscarOCrear(this.usuarios,usr,callback);
        }
        function buscarOCrear(coleccion,criterio,callback)
        {
            coleccion.findOneAndUpdate(criterio, {$set: criterio}, {upsert:
            true,returnDocument:"after",projection:{email:1}}, function(err,doc) {
            if (err) { throw err; }
            else {
                console.log("Elemento actualizado");
                console.log(doc.value.email);
                callback({email:doc.value.email});
            }
            });
        }

    this.buscarUsuario=function(criterio,callback){
        buscar(this.usuarios,criterio,callback);
    }

    function buscar(coleccion,criterio,callback){
        let col=coleccion;
        coleccion.find(criterio).toArray(function(error,usuarios){
            if (usuarios.length==0){
                callback(undefined);
            }
            else{
                callback(usuarios[0]);
            }
        });
    }


    this.insertarUsuario=function(usuario,callback){ 
        insertar(this.usuarios,usuario,callback); 
    }

    function insertar(coleccion,elemento,callback){
		coleccion.insertOne(elemento,function(err,result){
			if(err){
				console.log("error");
			}
			else{
				console.log("Nuevo elemento creado");
				callback(elemento);
			}
		});
	}

    this.insertarLog=function(registro,callback){
        insertar(this.logs,registro,callback);
    }

    this.obtenerLogs=function(callback){
        this.logs.find({}).toArray(function(err,result){
            if(err){
                callback([]);
            }
            else{
                callback(result);
            }
        });
    }

    this.actualizarUsuario=function(usuario,callback){
        actualizar(this.usuarios,usuario,callback);
    }

    function actualizar(coleccion,elemento,callback){
        coleccion.findOneAndUpdate({email:elemento.email},{$set:elemento},{returnDocument:"after"},function(err,doc){
            if(err){
                throw err;
            }
            else{
                console.log("Elemento actualizado");
                callback(doc.value);
            }
        });
    }

    this.actualizarUsuario=function(obj,callback){ 
        actualizar(this.usuarios,obj,callback); 
    }

    function actualizar(coleccion,obj,callback){
			coleccion.findOneAndUpdate({_id:ObjectId(obj._id)}, {$set: obj},
		{upsert: false,returnDocument:"after",projection:{email:1}},
		function(err,doc) {
			if (err) { throw err; }
			else {
				console.log("Elemento actualizado");
				callback({email:doc.value.email});
			}
		});
	}

    // ==========================================
    // FUNCIONES ADICIONALES PARA SISTEMA DE PARTIDAS
    // ==========================================
    
    // Actualizar usuario por email (sin necesitar _id)
    this.actualizarUsuarioPorEmail = function(obj, callback) {
        let cad = this;
        const email = obj.email;
        delete obj.email; // No incluir email en $set
        
        this.usuarios.findOneAndUpdate(
            { email: email },
            { $set: obj },
            { upsert: false, returnDocument: "after" },
            function(err, doc) {
                if (err) {
                    console.error("Error actualizando usuario:", err);
                    callback({ error: err.message });
                } else if (doc && doc.value) {
                    console.log("Usuario actualizado:", email);
                    callback(doc.value);
                } else {
                    callback({ error: "Usuario no encontrado" });
                }
            }
        );
    }
    
    // Incrementar campos numéricos de usuario
    this.incrementarCamposUsuario = function(email, incrementos, callback) {
        this.usuarios.findOneAndUpdate(
            { email: email },
            { $inc: incrementos },
            { upsert: false, returnDocument: "after" },
            function(err, doc) {
                if (err) {
                    console.error("Error incrementando campos:", err);
                    callback({ error: err.message });
                } else if (doc && doc.value) {
                    callback(doc.value);
                } else {
                    callback({ error: "Usuario no encontrado" });
                }
            }
        );
    }
    
    // Obtener ranking por copas
    this.obtenerRankingCopas = function(limite, callback) {
        this.usuarios.find({ copas: { $exists: true } })
            .sort({ copas: -1 })
            .limit(limite || 100)
            .toArray(function(err, result) {
                if (err) {
                    callback([]);
                } else {
                    callback(result.map((u, i) => ({
                        posicion: i + 1,
                        email: u.email,
                        nick: u.nick || u.email,
                        copas: u.copas || 0,
                        nivel: u.nivel || 1,
                        victorias: u.victorias || 0
                    })));
                }
            });
    }
    
    // Guardar estadísticas de partida
    this.guardarEstadisticasPartida = function(estadisticas, callback) {
        if (!this.partidasHistorial) {
            // Crear colección si no existe
            this.partidasHistorial = this.usuarios.s.db.collection("partidasHistorial");
        }
        
        this.partidasHistorial.insertOne(estadisticas, function(err, result) {
            if (err) {
                console.error("Error guardando estadísticas:", err);
                callback({ error: err.message });
            } else {
                callback({ insertado: true, id: result.insertedId });
            }
        });
    }
}
module.exports.CAD = CAD;