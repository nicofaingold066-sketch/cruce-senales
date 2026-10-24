// "¿Qué guarda CRUXE de mí?" (fila 55 de docs/investigacion-a-producto.md; idea de login; psico D5): un plegable corto
// y honesto en las pantallas de entrada. Cada línea sale del contrato (enmiendas 7, 8 y 9) y de cómo funciona la sesión;
// si algo de eso cambia, cambia acá (actividad del grupo: ingresos, salidas y bajas con nombre; psico 22:29: lo que sale a otros servicios). No promete lo que el servidor no garantiza (en grupos chicos, un total puede dejar
// adivinar algo: por eso no se muestran totales con 3 personas o menos).
// Exportado para que front-juan lo ponga también en Perfil: <QueGuarda />
import './friccion.css'

export function QueGuarda() {
  return (
    <details className="tarjeta plegable que-guarda">
      <summary>¿Qué guarda CRUXE de mí?</summary>
      <ul className="que-guarda-lista">
        <li>
          <strong>Una sesión anónima en este teléfono.</strong> Sin correo ni contraseña; si borras los datos del navegador, se
          pierde.
        </li>
        <li>
          <strong>El grupo ve</strong> tu nombre, si te interesa, si confirmaste y cuándo te unes, sales del grupo o te bajas de un plan.
          <strong> Nadie ve</strong> tus motivos, cuándo puedes ni tus condiciones (quien organiza ve solo cuántos respondieron).
        </li>
        <li>
          <strong>Gustos y presupuesto</strong>, si los cuentas, son privados: a la inteligencia artificial solo le llegan opciones
          ya elegidas y totales. «Buscar el lugar en el mapa» abre Google Maps con el nombre del plan. Todo lo de hoy son datos
          ficticios.
        </li>
      </ul>
    </details>
  )
}
