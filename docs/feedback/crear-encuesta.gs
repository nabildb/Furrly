/**
 * Crea en tu Google Drive la encuesta de feedback de Furrly.
 * Uso: script.google.com → Nuevo proyecto → pega este archivo → Ejecutar "crearEncuesta".
 * Al terminar, en el "Registro de ejecución" salen el enlace para editarla y el enlace para enviarla.
 */
function crearEncuesta() {
  const form = FormApp.create('Furrly · ¿Qué te ha parecido?')
  form
    .setDescription(
      'Gracias por probar Furrly (https://furrly-rouge.vercel.app), la red social para encontrar mascotas perdidas. ' +
        'Es mi proyecto de 2.º de DAW y tu opinión me ayuda mucho. Son unos 3 minutos y todo es anónimo.',
    )
    .setProgressBar(true)
    .setConfirmationMessage('¡Muchas gracias! 🐾 Si se te ocurre algo más, dímelo cuando quieras.')

  // 1. Sobre ti (en la primera página, junto a la descripción)
  form
    .addCheckboxItem()
    .setTitle('¿Desde dónde la has probado?')
    .setChoiceValues(['Móvil', 'Ordenador', 'Tablet'])
    .setRequired(true)
  form
    .addMultipleChoiceItem()
    .setTitle('¿Tienes mascota?')
    .setChoiceValues(['Sí, perro', 'Sí, gato', 'Sí, otra', 'No'])
    .showOtherOption(false)

  // 2. Primera impresión
  form.addPageBreakItem().setTitle('Primera impresión')
  form
    .addScaleItem()
    .setTitle('En general, ¿qué te ha parecido?')
    .setBounds(1, 5)
    .setLabels('No me gusta', 'Me encanta')
    .setRequired(true)
  form
    .addMultipleChoiceItem()
    .setTitle('Nada más entrar, ¿entendiste para qué sirve Furrly?')
    .setChoiceValues(['Sí, enseguida', 'Más o menos', 'No'])
    .setRequired(true)
  form
    .addScaleItem()
    .setTitle('¿Qué te parece el diseño?')
    .setBounds(1, 5)
    .setLabels('Feo', 'Muy bonito')

  // 3. Lo que has probado
  form.addPageBreakItem().setTitle('Lo que has probado')
  form
    .addCheckboxItem()
    .setTitle('¿Qué has hecho?')
    .setChoiceValues([
      'Mirar el mapa de avisos',
      'Ver la ficha de una mascota perdida',
      'Crear una cuenta (con email o Google)',
      'Publicar un aviso',
      'Avisar de que he visto una mascota',
      'Comunidad: publicaciones, likes, comentarios',
      'Escribir un mensaje',
      'Activar las notificaciones',
      'Instalarla en el móvil',
    ])
    .showOtherOption(true)
  form
    .addScaleItem()
    .setTitle('Si has publicado un aviso, ¿ha sido fácil?')
    .setBounds(1, 5)
    .setLabels('Muy difícil', 'Muy fácil')
  form
    .addParagraphTextItem()
    .setTitle('¿Algo ha fallado o no funcionaba?')
    .setHelpText('Si puedes, di en qué pantalla y si era en móvil u ordenador.')
  form.addParagraphTextItem().setTitle('¿Algo te ha resultado confuso o difícil de encontrar?')

  // 4. ¿Te sería útil?
  form.addPageBreakItem().setTitle('¿Te sería útil?')
  form
    .addMultipleChoiceItem()
    .setTitle('Si se perdiera tu mascota (o la de alguien cercano), ¿usarías Furrly?')
    .setChoiceValues(['Seguro que sí', 'Probablemente', 'No lo sé', 'No'])
    .setRequired(true)
  form.addParagraphTextItem().setTitle('¿Qué echas de menos o añadirías?')
  form
    .addScaleItem()
    .setTitle('Del 0 al 10, ¿se la recomendarías a alguien con mascota?')
    .setBounds(0, 10)
    .setLabels('Nada probable', 'Muy probable')
    .setRequired(true)
  form.addParagraphTextItem().setTitle('¿Algo más que quieras decirme?')
  form.addTextItem().setTitle('Tu nombre (opcional)')

  Logger.log('Editar la encuesta: ' + form.getEditUrl())
  Logger.log('Enlace para enviar: ' + form.shortenFormUrl(form.getPublishedUrl()))
}
