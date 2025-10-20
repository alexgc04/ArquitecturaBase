function Sistema(){
    this.usuarios={};

    this.agregarUsuario=function(nick){
        let res={"nick":-1};
        if(!this.usuarios[nick]){
            this.usuarios[nick]=new Usuario(nick);
            res.nick=nick;
        } else {
            console.log("El nick" + nick + " ya está en uso");
        }
        return res;
    }

    this.obtenerUsuarios=function(){
        return this.usuarios;
    } 

    this.usuarioActivo=function(nick){
        let res={"nick":-1};
        if(this.usuarios[nick]){
            res.nick=true;
            return res;
        }
        res.nick=false;
        return res;
    }

    this.eliminarUsuario=function(nick){
        if(this.usuarios[nick]){
            delete this.usuarios[nick];
            return {deleted: true};
        }
        return {deleted: false};
    }

    this.numeroUsuarios=function(){
        return Object.keys(this.usuarios).length;
    }

}

function Usuario(nick){
    this.nick=nick;
}

module.exports.Sistema=Sistema;


