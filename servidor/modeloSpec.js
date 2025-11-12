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

})

