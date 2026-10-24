// "¿Qué guarda CRUXE de mí?" (fila 55 de docs/investigacion-a-producto.md; idea de login; psico D5): un plegable corto
// y honesto en las pantallas de entrada. Cada línea sale del contrato (enmiendas 7, 8 y 9) y de cómo funciona la sesión;
// si algo de eso cambia, cambia acá (enmienda 13: las bajas ajenas salen sin nombre; psico 22:29: lo que sale a otros servicios). No promete lo que el servidor no garantiza (en grupos chicos, un total puede dejar
// adivinar algo: por eso no se muestran totales con 3 personas o menos).
// Exportado para que front-juan lo ponga también en Perfil: <QueGuarda />
import './friccion.css'

export function QueGuarda() {
  return (
    <details className="tarjeta plegable que-guarda">
      <summary>¿Qué guarda CRUXE de mí?</summary>
      <ul className="que-guarda-lista">
        <li>
          <strong>Una sesión anónima en este teléfono.</strong> Sin correo, teléfono ni contraseña. Si borras los datos del
          navegador, se pierde: no hay cuenta para recuperarla.
        </li>
        <li>
          <strong>Tu nombre en el grupo.</strong> Lo ve el grupo, y quien tenga el código de invitación ve la lista de nombres.
        </li>
        <li>
          <strong>Cuándo puedes.</strong> Nadie del grupo lo ve; solo se usa para armar la opción. Quien organiza ve cuántas
          personas respondieron; no quién ni qué.
        </li>
        <li>
          <strong>Lo que sí ve el grupo:</strong> si marcaste "Me interesa" y si confirmaste una versión. Si te retiras, el grupo
          ve que una persona se retiró, sin tu nombre.
        </li>
        <li>
          <strong>Tus gustos y presupuesto</strong>, si los cuentas: privados. A quien organiza le llegan solo totales del
          grupo, con más de 3 personas, y nunca el presupuesto. Puedes apagarlo en "Mis preferencias".
        </li>
        <li>
          <strong>Fuera de CRUXE:</strong> a la inteligencia artificial solo le llegan opciones ya elegidas y totales del grupo,
          nunca a una persona ni lo que pusiste. Si tocas "Buscar el lugar en el mapa", se abre Google Maps con el nombre del
          plan. Todo lo de hoy son datos ficticios de prueba.
        </li>
      </ul>
    </details>
  )
}
