function CAD(){

    // Cargar variables de entorno desde .env si existe
    try { require('dotenv').config(); } catch(_) {}

    const mongo=require("mongodb").MongoClient; 
    const ObjectId=require("mongodb").ObjectId;

    this.usuarios;

    // Conectar a Mongo Atlas
    this.conectar=async function(callback){
        let cad=this;
        const uri = process.env.MONGO_URI;
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

    this.buscarUsuario=function(obj,callback){ 
        buscar(this.usuarios,obj,callback); 
    }

    this.insertarUsuario=function(usuario,callback){ 
        insertar(this.usuarios,usuario,callback); 
    }

    function buscar(coleccion,criterio,callback){
		coleccion.find(criterio).toArray(function(error,usuarios){
			if (usuarios.length==0){
				callback(undefined);
			}
			else{
				callback(usuarios[0]);
			}
		});
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
}
module.exports.CAD = CAD;