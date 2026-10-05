export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqCategory {
  title: string;
  items: FaqItem[];
}

export const FAQ_DATA: FaqCategory[] = [
  {
    title: "Primeros Pasos",
    items: [
      { question: "¿Qué es UniversumK9 Stack?", answer: "UniversumK9 Stack es un sistema de gestión de inventario que te ayuda a rastrear existencias, administrar proveedores, crear órdenes de compra y obtener información a través de análisis." },
      { question: "¿Cómo entro en modo demo?", answer: "Haz clic en 'Probar Demo' en la página de inicio. El modo demo carga datos de prueba para que puedas explorar todas las funciones sin crear una cuenta." },
      { question: "¿Cómo navego por la aplicación?", answer: "Usa la barra lateral (escritorio) o la barra de navegación inferior (móvil) para cambiar entre secciones. Presiona CMD+K para abrir la paleta de comandos para una búsqueda rápida." },
      { question: "¿Puedo restablecer los datos de la demo?", answer: "¡Sí! Ve a Configuración → Sistema y haz clic en 'Restablecer Datos de Demo' para restaurar todos los datos de muestra a su estado original." },
      { question: "¿Qué roles están disponibles?", answer: "Tres roles: Admin (acceso completo), Manager (puede gestionar inventario y OCs), y Requestor (puede navegar por el catálogo y enviar solicitudes)." },
    ],
  },
  {
    title: "Gestión de Inventario",
    items: [
      { question: "¿Cómo agrego un nuevo producto?", answer: "Ve a Catálogo y haz clic en '+ Nuevo Producto'. Completa el nombre, SKU, categoría y detalles de existencias. El SKU debe ser único." },
      { question: "¿Qué significan los colores del estado de inventario?", answer: "Verde (En Existencia): cantidad por encima del punto de reorden. Ámbar (Existencias Bajas): cantidad igual o por debajo del punto de reorden. Rojo (Agotado): cantidad cero." },
      { question: "¿Cómo registro un movimiento de inventario?", answer: "Ve a Movimientos y haz clic en 'Registrar Movimiento'. Selecciona el tipo (Entrada, Salida, Ajuste o Transferencia), elige el producto e ingresa la cantidad." },
      { question: "¿Qué es un punto de reorden?", answer: "El umbral de cantidad mínima que activa una alerta de existencias bajas. Cuando las existencias caen a este nivel o por debajo, el producto aparece en 'Requiere atención'." },
      { question: "¿Cómo actualizo productos masivamente?", answer: "En el Catálogo, selecciona múltiples productos usando casillas, luego usa la barra de acciones masivas para actualizar la categoría, archivar o eliminar los productos seleccionados." },
    ],
  },
  {
    title: "Órdenes de Compra",
    items: [
      { question: "¿Cómo creo una orden de compra?", answer: "Ve a Órdenes de Compra y haz clic en 'Crear Orden'. Selecciona un proveedor, agrega las líneas con cantidades y costos, y luego envíala." },
      { question: "¿Cuáles son los estados de una OC?", answer: "Borrador (aún no enviada), Enviada (enviada al proveedor), Recibida Parcialmente (algunos productos recibidos), Recibida Totalmente (todos los productos recibidos), Cancelada." },
      { question: "¿Cómo recibo un envío?", answer: "Abre una OC enviada y haz clic en 'Recibir Envío'. Ingresa las cantidades recibidas para cada línea. El inventario se actualiza automáticamente." },
      { question: "¿Puedo imprimir una orden de compra?", answer: "Sí, abre la vista de detalle de la OC y haz clic en el ícono de imprimir. Esto genera una vista imprimible con todos los detalles de la orden." },
    ],
  },
  {
    title: "Reportes y Análisis",
    items: [
      { question: "¿Qué reportes están disponibles?", answer: "Resumen de Inventario (por categoría y estado), Tendencias de Movimientos (a lo largo del tiempo), Análisis de Rotación, cuadros de mando de Rendimiento de Proveedores, y desglose de Costos." },
      { question: "¿Puedo exportar datos?", answer: "Sí, usa el botón 'Exportar CSV' en la página de Análisis o el botón de exportación en las tablas de datos para descargar tus datos." },
      { question: "¿Qué son los AI Insights?", answer: "Funciones impulsadas por IA que incluyen sugerencias de reorden basadas en patrones de demanda, detección de anomalías para movimientos inusuales y búsqueda en lenguaje natural." },
    ],
  },
  {
    title: "Cuenta y Configuración",
    items: [
      { question: "¿Cómo administro usuarios?", answer: "Los administradores pueden ir a Configuración → Usuarios para invitar a nuevos usuarios, cambiar roles y desactivar cuentas." },
      { question: "¿Cómo cambio las categorías?", answer: "Ve a Configuración → Categorías para agregar, renombrar o eliminar categorías. Los productos en una categoría eliminada pasan a no estar categorizados." },
      { question: "¿Dónde están las preferencias de notificación?", answer: "Haz clic en el ícono de campana en el encabezado, luego en el ícono de engranaje para personalizar qué notificaciones recibes." },
    ],
  },
  {
    title: "Módulo de Finanzas (ERP)",
    items: [
      { question: "¿Cómo funciona el Estado de Resultados (P&L)?", answer: "El panel de Finanzas resta automáticamente tus Gastos Operativos (OPEX) y lo que le debes a los Proveedores (Cuentas por Pagar) de tus Ingresos Brutos. Esto te muestra una utilidad neta estimada del mes actual." },
      { question: "¿Cómo registro los gastos de caja chica o luz?", answer: "En la pestaña 'Gastos Operativos' dentro de Finanzas, haz clic en 'Registrar Gasto'. Puedes categorizarlo como Renta, Luz, Insumos, etc." },
      { question: "¿Cómo cancelo una deuda con un proveedor?", answer: "Cuando haces una Orden de Compra, automáticamente se va a tus 'Cuentas por Pagar'. Una vez que le pagues al proveedor, haz clic en 'Liquidar' para que desaparezca la deuda." },
    ]
  },
  {
    title: "Módulo de Nómina (Payroll)",
    items: [
      { question: "¿Cómo establezco el Sueldo Base de mis empleados?", answer: "Por ahora se hace en la base de datos (columna base_salary). Pronto estará disponible desde la pantalla de Ajustes de Empleados." },
      { question: "¿Cómo genero un recibo de nómina?", answer: "Ve a Administración -> Nómina. Busca al empleado y da clic en 'Calcular'. Verás su sueldo base, y podrás ingresar bonos, comisiones o descuentos por retardos de forma manual." },
      { question: "¿Dónde veo los recibos que ya hice?", answer: "En la misma sección de Nómina, entra a la pestaña 'Historial de Pagos' para ver los borradores de recibos pendientes o los que ya se marcaron como Pagados." },
    ]
  },
  {
    title: "Gestión de Activos Fijos y Mantenimiento",
    items: [
      { question: "¿Qué diferencia hay entre Inventario y Activos Fijos?", answer: "El Inventario es lo que vendes (ej. vacunas, alimentos). Los Activos Fijos son las máquinas que usas para operar pero no vendes (Rayos X, computadoras, mesas de cirugía)." },
      { question: "¿Para qué sirve programar mantenimientos?", answer: "Si agendas un próximo servicio en la bitácora de un equipo, el sistema lo pintará de Amarillo semanas antes y Rojo si se venció la fecha, alertándote para prevenir daños por falta de servicio." },
      { question: "¿Cómo reporto un equipo descompuesto?", answer: "Ve al Catálogo de Activos, busca el equipo y presiona el botón 'Falla'. Esto cambiará su estatus a 'En Mantenimiento' hasta que se registre el servicio técnico." },
    ]
  },
  {
    title: "Agenda y Consultas (Clínica)",
    items: [
      { question: "¿Cómo envío recordatorios por WhatsApp a mis clientes?", answer: "Las citas agendadas procesan recordatorios de WhatsApp de forma automática todos los días a las 8am usando la integración con Twilio. Asegúrate de configurar tus credenciales de Twilio en las variables de entorno." },
      { question: "¿Puedo tener múltiples consultas al mismo tiempo?", answer: "Sí, el panel general te permite iniciar múltiples consultas simultáneas con diferentes doctores. Se registran en la Bitácora del Paciente automáticamente." },
    ]
  }
];
