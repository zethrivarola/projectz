// Inicializar workers solo en servidor
if (typeof window === 'undefined') {
  console.log('🚀 Initializing background workers...');
  
  // Forzar carga del worker
  import('./download-worker').then((module) => {
    console.log('✅ Download worker loaded and registered');
    
    // Verificar que el procesador esté registrado
    import('./download-queue').then(({ downloadQueue }) => {
      console.log('✅ Queue initialized:', downloadQueue.name);
    });
  }).catch(err => {
    console.error('❌ Failed to start workers:', err);
  });
}

export {};
