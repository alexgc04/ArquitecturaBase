const modelo = require("./modelo.js");


describe('El sistema...', function() {
  let sistema;
  beforeEach(function() {
   sistema = new modelo.Sistema({test: true});
  });

it('inicialmente no hay usuarios', function() { 
  expect(sistema.numeroUsuarios()).toEqual(0); 
}); 

it('agregarUsuario', function() {
    /*sistema.agregarUsuario('pepe');
    let usuario = sistema.agregarUsuario('pepe');*/     // agregar usuario del profesor pero sin jasmine

    const usuario = sistema.agregarUsuario('pepe');
    expect(usuario).toEqual({nick: 'pepe'});
    expect(sistema.numeroUsuarios()).toEqual(1);
    expect(sistema.usuarioActivo('pepe').nick).toBe(true);
  });

it('obtener usuarios', function() {
  sistema.agregarUsuario('ana');
  const usuarios = sistema.obtenerUsuarios();
  expect(usuarios['ana'].nick).toEqual('ana');
});

 it('usuarioActivo', function() {
   sistema.agregarUsuario('ana');
    expect(sistema.usuarioActivo('ana').nick).toBe(true);
    expect(sistema.usuarioActivo('carlos').nick).toBe(false);
  });

 it('eliminarUsuario', function() {
    sistema.agregarUsuario('juan');
    expect(sistema.numeroUsuarios()).toEqual(1);
    const resDel = sistema.eliminarUsuario('juan');
    expect(resDel).toEqual({deleted: true});
    expect(sistema.numeroUsuarios()).toEqual(0);
    expect(sistema.usuarioActivo('juan').nick).toBe(false);
  });

  describe("Pruebas de las partidas", function() {
    let usr2;
    let usr3;

    beforeEach(function() {
      usr2 = {"nick": "Pepa", "email": "pepa@pepa.es"};
      usr3 = {"nick": "Pepo", "email": "pepo@pepo.es"};
      sistema.agregarUsuario(usr2);
      sistema.agregarUsuario(usr3);
    });

    it("Usuarios y partidas en el sistema", function() {
      expect(sistema.numeroUsuarios()).toEqual(3); // pepe (from outer describe) + pepa + pepo
      expect(sistema.obtenerPartidasDisponibles().length).toEqual(0);
    });

    it("Crear partida", function() {
      let codigo = sistema.crearPartida(usr2.email);
      expect(codigo).not.toBe(-1);
      expect(sistema.partidas[codigo]).toBeDefined();
      expect(sistema.partidas[codigo].jugadores.length).toBe(1);
      expect(sistema.partidas[codigo].jugadores[0]).toBe(usr2.email);
    });

    it("Unir a partida", function() {
      let codigo = sistema.crearPartida(usr2.email);
      let res = sistema.unirAPartida(usr3.email, codigo);
      expect(res).toBe(codigo);
      expect(sistema.partidas[codigo].jugadores.length).toBe(2);
      expect(sistema.partidas[codigo].jugadores[1]).toBe(usr3.email);
    });

    it("Obtener partidas", function() {
      let codigo = sistema.crearPartida(usr2.email);
      let lista = sistema.obtenerPartidasDisponibles();
      expect(lista.length).toBe(1);
      expect(lista[0].codigo).toBe(codigo);
      
      sistema.unirAPartida(usr3.email, codigo);
      lista = sistema.obtenerPartidasDisponibles();
      expect(lista.length).toBe(0);
    });
  });
})

