<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import Chart from 'chart.js/auto';
import Gantt from 'frappe-gantt';
import './styles/frappe-gantt.css';
import api from './services/api.js';

const drawer = ref(true);
const active = ref('dashboard');

const persons = ref([]);
const customers = ref([]);
const departments = ref([]);
const templates = ref([]);
const orders = ref([]);
const statuses = ref([]);
const assignments = ref([]);
const todoTemplates = ref([]);
const todos = ref([]);
const departmentOptions = computed(() => departments.value.map((d) => d.code || d.name));
const customerOptions = computed(() => customers.value.map((c) => `${c.name}${c.surname ? ' ' + c.surname : ''}`));
const defaultHours = [0, 8, 8, 8, 6, 0, 0, 8];
const weekDays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Extra'];
const chartRef = ref(null);
const ganttContainer = ref(null);
let chartInstance = null;
let ganttInstance = null;
const slotOptions = [
  { title: 'Mattina 1', value: 'm1' },
  { title: 'Mattina 2', value: 'm2' },
  { title: 'Pomeriggio 1', value: 'p1' },
  { title: 'Pomeriggio 2', value: 'p2' },
];

const loading = reactive({
  persons: false,
  customers: false,
  departments: false,
  templates: false,
  orders: false,
  statuses: false,
  assignments: false,
  todoTemplates: false,
  todos: false,
});

const personForm = reactive({
  name: '',
  surname: '',
  email: '',
  mobile: '',
  type: 'EMP',
  department: '',
  hours: [...defaultHours],
});
const editingPersonId = ref(null);

const customerForm = reactive({ name: '', surname: '', note: '' });
const editingCustomerId = ref(null);

const departmentForm = reactive({ code: '', name: '' });
const editingDepartmentId = ref(null);

const templateForm = reactive({ name: '', stages: [] });
const editingTemplateId = ref(null);
const newStage = reactive({ name: '', department: '', percentageOfWork: 0, orderBy: 1, dueDate: '' });

const orderForm = reactive({
  code: '',
  customer: '',
  status: '',
  estimateHours: 0,
  dueDate: '',
  templateId: '',
  mediumTermPlan: false,
  stages: [],
  statusHistory: [],
});
const editingOrderId = ref(null);
const newOrderStage = reactive({ name: '', department: '', percentageOfWork: 0, orderBy: 1, dueDate: '' });
const statusForm = reactive({ name: '', enableInOrder: true, enableInQuotation: true });
const editingStatusId = ref(null);
const weekStart = ref(getMonday(new Date()));
const assignmentForm = reactive({
  personId: '',
  orderCode: '',
  note: '',
  date: new Date().toISOString().slice(0, 10),
  slot: 'm1',
});
const editingAssignmentId = ref(null);
const quickDialog = ref(false);
const quickAssignmentForm = reactive({
  personId: '',
  orderCode: '',
  note: '',
  date: '',
  slot: '',
});
const todoTemplateForm = reactive({
  title: '',
  subTodos: [],
});
const editingTodoTemplateId = ref(null);
const newTodoSub = reactive({ description: '', assignedTo: '', assignedToName: '', checks: [] });
const newTodoCheck = reactive({ name: '', emailNotification: false, deadline: '' });
const todoForm = reactive({
  title: '',
  orderId: '',
  orderCode: '',
  customer: '',
  templateId: '',
  subTodos: [],
  status: '',
  statusHistory: [],
});
const editingTodoId = ref(null);
const todoDialog = ref(false);

const monthLabels = computed(() => {
  const labels = [];
  const start = new Date();
  for (let i = 0; i <= 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    labels.push(d.toLocaleString('it-IT', { month: 'short', year: 'numeric' }));
  }
  return labels;
});

const monthlyCapacityByDept = computed(() => {
  const start = new Date();
  const labels = monthLabels.value;
  const departmentsSet = new Set(
    persons.value
      .map((p) => p.department || 'N/D')
      .filter((d) => d && d.length)
  );
  const depts = Array.from(departmentsSet);
  const dataByDept = {};
  depts.forEach((d) => (dataByDept[d] = Array(labels.length).fill(0)));

  labels.forEach((_, idx) => {
    const currentMonth = new Date(start.getFullYear(), start.getMonth() + idx, 1);
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const current = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const dow = current.getDay();
      persons.value.forEach((p) => {
        const dept = p.department || 'N/D';
        if (!dataByDept[dept]) dataByDept[dept] = Array(labels.length).fill(0);
        const hoursArray = p.hoursPerDayOfTheWeek || defaultHours;
        const hours = hoursArray[dow] ?? 0;
        dataByDept[dept][idx] += hours;
      });
    }
  });

  return { labels, dataByDept };
});

const departmentColors = [
  '#2196f3',
  '#43a047',
  '#ffb300',
  '#e53935',
  '#8e24aa',
  '#00acc1',
  '#6d4c41',
  '#7cb342',
  '#fb8c00',
  '#3949ab',
];

const departmentColorMap = computed(() => {
  const map = {};
  departments.value.forEach((d, idx) => {
    map[d.code || d.name || `DEP-${idx}`] = departmentColors[idx % departmentColors.length];
  });
  return map;
});

const colorForDept = (dept) => {
  return departmentColorMap.value[dept] || departmentColors[dept ? dept.length % departmentColors.length : 0];
};

const orderStatusOptions = computed(() => statuses.value.filter((status) => status.enableInOrder));
const getLastStatusName = (events) => {
  if (!events || !events.length) return '';
  return events[events.length - 1].name;
};

const getLastStatusDate = (events) => {
  if (!events || !events.length) return '';
  const last = events[events.length - 1];
  return last.changeDate ? new Date(last.changeDate).toISOString().slice(0, 10) : '';
};

const buildStatusHistory = (existing = [], selected) => {
  if (!selected) return existing || [];
  const normalizedExisting = Array.isArray(existing) ? [...existing] : [];
  const last = normalizedExisting[normalizedExisting.length - 1];
  if (last?.name === selected) {
    return normalizedExisting;
  }
  return [
    ...normalizedExisting,
    {
      name: selected,
      changeDate: new Date().toISOString(),
    },
  ];
};

const kanbanColumns = computed(() => {
  const columns = orderStatusOptions.value.map((status, idx) => ({
    headerText: status.name,
    keyField: status.name,
    isEnabled: true,
  }));
  if (!columns.length) {
    columns.push({ headerText: 'Senza stato', keyField: 'Senza stato' });
  }
  return columns;
});

const ordersByStatus = computed(() => {
  const fallback = kanbanColumns.value[0]?.keyField || 'Senza stato';
  const map = {};
  orders.value.forEach((order) => {
    const status = getLastStatusName(order.statuses) || fallback;
    if (!map[status]) map[status] = [];
    map[status].push(order);
  });
  // ensure columns present even if empty
  kanbanColumns.value.forEach((column) => {
    if (!map[column.keyField]) map[column.keyField] = [];
  });
  return map;
});

const getOrderLabel = (id) => {
  const order = orders.value.find((o) => o._id === id);
  return order ? `${order.code} - ${order.customer}` : '';
};

watch(
  () => todoForm.orderId,
  (id) => {
    const order = orders.value.find((o) => o._id === id);
    if (order) {
      todoForm.orderCode = order.code;
      todoForm.customer = order.customer;
    } else {
      todoForm.orderCode = '';
      todoForm.customer = '';
    }
  }
);

const orderOptions = computed(() => orders.value.map((o) => ({ title: o.code, value: o.code })));
const orderSelectOptions = computed(() => orders.value.map((o) => ({ title: `${o.code} - ${o.customer}`, value: o._id })));

const getPersonLabel = (id) => {
  const person = persons.value.find((p) => p._id === id);
  return person ? `${person.name} ${person.surname || ''}`.trim() : '';
};

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const renderChart = () => {
  if (!chartRef.value) return;
  const { labels, dataByDept } = monthlyCapacityByDept.value;
  const datasets = Object.entries(dataByDept).map(([dept, data], idx) => ({
    label: dept,
    data,
    backgroundColor: departmentColors[idx % departmentColors.length],
    borderColor: departmentColors[idx % departmentColors.length],
    borderWidth: 1,
  }));

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(chartRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: 'Capacità mensile per reparto (ore)' },
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true },
      },
    },
  });
};

const ganttTasks = computed(() => {
  const internalPersons = persons.value.filter((p) => p.type === 'EMP');
  const weekdayHours = [1, 2, 3, 4, 5]
    .map((dow) =>
      internalPersons.reduce((sum, p) => sum + ((p.hoursPerDayOfTheWeek || defaultHours)[dow] || 0), 0)
    )
    .filter((h) => h > 0);
  const dailyCapacity =
    weekdayHours.length > 0 ? Math.round(weekdayHours.reduce((a, b) => a + b, 0) / weekdayHours.length) : 8;

  const tasks = [];
  orders.value
    .filter((o) => o.estimateHours)
    .forEach((order, idx) => {
      const orderId = order._id || `order-${idx}`;
      const due = order.dueDate ? new Date(order.dueDate) : new Date();
      let start = new Date(due);
      if (order.mediumTermPlan && order.stages?.length) {
        const stageStarts = order.stages
          .map((stage) => stage.startDate && new Date(stage.startDate))
          .filter(Boolean);
        if (stageStarts.length) {
          start = new Date(Math.min(...stageStarts.map((d) => d.getTime())));
        }
      } else {
        const durationDays = Math.max(1, Math.ceil((Number(order.estimateHours) || 0) / (dailyCapacity || 8)));
        start = new Date(due);
        start.setDate(due.getDate() - durationDays + 1);
      }

      tasks.push({
        id: orderId,
        name: `${order.code} (${order.customer || 'cliente'})`,
        start: start.toISOString().slice(0, 10),
        end: due.toISOString().slice(0, 10),
        progress: 0,
        custom_class: '',
        orderCode: order.code,
        department: order.stages?.[0]?.department || '',
        color: colorForDept(order.stages?.[0]?.department),
      });

      if (order.mediumTermPlan && order.stages?.length) {
        const sortedStages = [...order.stages].sort((a, b) => (a.orderBy || 0) - (b.orderBy || 0));
        sortedStages.forEach((stage, stageIdx) => {
          const startDate = stage.startDate ? new Date(stage.startDate) : null;
          const endDate = stage.dueDate ? new Date(stage.dueDate) : null;
          if (!startDate || !endDate) return;
          tasks.push({
            id: `${orderId}-stage-${stageIdx}`,
            name: `${order.code} - ${stage.name}`,
            start: startDate.toISOString().slice(0, 10),
            end: endDate.toISOString().slice(0, 10),
            parentId: orderId,
            progress: 0,
            custom_class: 'stage-task',
            department: stage.department,
            color: colorForDept(stage.department),
          });
        });
      }
    });

  return tasks.sort((a, b) => new Date(a.start) - new Date(b.start));
});

const renderGantt = () => {
  if (!ganttContainer.value) return;
  if (!ganttTasks.value.length) {
    if (ganttContainer.value) {
      ganttContainer.value.innerHTML = '';
    }
    ganttInstance = null;
    return;
  }
  if (ganttInstance) {
    ganttContainer.value.innerHTML = '';
    ganttInstance = null;
  }
  ganttInstance = new Gantt(ganttContainer.value, ganttTasks.value, {
    view_mode: 'Week',
    custom_popup_html: (task) => {
      return `<div class=\"p-2\"><strong>${task.name}</strong><br/>${task.start} → ${task.end}<br/>${task.department || ''}</div>`;
    },
  });
};

const operativeSections = [
  { key: 'dashboard', title: 'Overview' },
  { key: 'kanban', title: 'Kanban' },
  { key: 'orders', title: 'Ordini' },
  { key: 'gantt', title: 'Gantt Ordini' },
  { key: 'assignments', title: 'Assegnazioni settimanali' },
  { key: 'todos', title: 'Todo' },
];
const configSections = [
  { key: 'persons', title: 'Personale' },
  { key: 'customers', title: 'Clienti' },
  { key: 'departments', title: 'Reparti' },
  { key: 'templates', title: 'Template Ordini' },
  { key: 'todoTemplates', title: 'Todo Template' },
  { key: 'statuses', title: 'Stati' },
];

const resetPersonForm = () => {
  personForm.name = '';
  personForm.surname = '';
  personForm.email = '';
  personForm.mobile = '';
  personForm.type = 'EMP';
  personForm.department = '';
  personForm.hours = [...defaultHours];
  editingPersonId.value = null;
};

const resetCustomerForm = () => {
  customerForm.name = '';
  customerForm.surname = '';
  customerForm.note = '';
  editingCustomerId.value = null;
};

const resetDepartmentForm = () => {
  departmentForm.code = '';
  departmentForm.name = '';
  editingDepartmentId.value = null;
};

const resetTemplateForm = () => {
  templateForm.name = '';
  templateForm.stages = [];
  editingTemplateId.value = null;
};

const resetOrderForm = () => {
  orderForm.code = '';
  orderForm.customer = '';
  orderForm.status = '';
  orderForm.estimateHours = 0;
  orderForm.dueDate = '';
  orderForm.templateId = '';
  orderForm.stages = [];
  orderForm.statusHistory = [];
  orderForm.mediumTermPlan = false;
  editingOrderId.value = null;
};

const resetStatusForm = () => {
  statusForm.name = '';
  statusForm.enableInOrder = true;
  statusForm.enableInQuotation = true;
  editingStatusId.value = null;
};

const resetTodoTemplateForm = () => {
  todoTemplateForm.title = '';
  todoTemplateForm.subTodos = [];
  editingTodoTemplateId.value = null;
  newTodoSub.description = '';
  newTodoSub.assignedTo = '';
  newTodoSub.assignedToName = '';
  newTodoCheck.name = '';
  newTodoCheck.emailNotification = false;
};

const personNameFromId = (id) => {
  const person = persons.value.find((p) => p._id === id);
  return person ? `${person.name} ${person.surname || ''}`.trim() : '';
};

const addTemplateSub = () => {
  if (!newTodoSub.description.trim()) return;
  todoTemplateForm.subTodos.push({
    description: newTodoSub.description,
    assignedTo: newTodoSub.assignedTo || undefined,
    assignedToName: newTodoSub.assignedToName || personNameFromId(newTodoSub.assignedTo) || undefined,
    checks: (newTodoSub.checks || []).map((check) => ({ ...check })),
  });
  newTodoSub.description = '';
  newTodoSub.assignedTo = '';
  newTodoSub.assignedToName = '';
  newTodoSub.checks = [];
};

const addTemplateCheck = () => {
  if (!newTodoCheck.name.trim()) return;
  newTodoSub.checks = newTodoSub.checks || [];
  newTodoSub.checks.push({
    name: newTodoCheck.name,
    emailNotification: newTodoCheck.emailNotification,
    deadline: newTodoCheck.deadline || undefined,
    completed: false,
  });
  newTodoCheck.name = '';
  newTodoCheck.emailNotification = false;
  newTodoCheck.deadline = '';
};

const removeTemplateSub = (index) => {
  todoTemplateForm.subTodos.splice(index, 1);
};

const saveTodoTemplate = async () => {
  const payload = { ...todoTemplateForm };
  if (editingTodoTemplateId.value) {
    await api.put(`/todo-templates/${editingTodoTemplateId.value}`, payload);
  } else {
    await api.post('/todo-templates', payload);
  }
  await loadTodoTemplates();
  resetTodoTemplateForm();
};

const editTodoTemplate = (template) => {
  editingTodoTemplateId.value = template._id;
  todoTemplateForm.title = template.title;
  todoTemplateForm.subTodos = (template.subTodos || []).map((sub) => ({ ...sub }));
};

const deleteTodoTemplate = async (id) => {
  await api.delete(`/todo-templates/${id}`);
  await loadTodoTemplates();
};


const loadPersons = async () => {
  loading.persons = true;
  try {
    const { data } = await api.get('/persons');
    persons.value = data;
  } finally {
    loading.persons = false;
  }
};

const loadCustomers = async () => {
  loading.customers = true;
  try {
    const { data } = await api.get('/customers');
    customers.value = data;
  } finally {
    loading.customers = false;
  }
};

const loadDepartments = async () => {
  loading.departments = true;
  try {
    const { data } = await api.get('/departments');
    departments.value = data;
  } finally {
    loading.departments = false;
  }
};

const loadTemplates = async () => {
  loading.templates = true;
  try {
    const { data } = await api.get('/order-templates');
    templates.value = data;
  } finally {
    loading.templates = false;
  }
};

const loadOrders = async () => {
  loading.orders = true;
  try {
    const { data } = await api.get('/orders');
    orders.value = data;
  } finally {
    loading.orders = false;
  }
};

const loadStatuses = async () => {
  loading.statuses = true;
  try {
    const { data } = await api.get('/statuses');
    statuses.value = data;
  } finally {
    loading.statuses = false;
  }
};

const loadTodoTemplates = async () => {
  loading.todoTemplates = true;
  try {
    const { data } = await api.get('/todo-templates');
    todoTemplates.value = data;
  } finally {
    loading.todoTemplates = false;
  }
};

const loadTodos = async () => {
  loading.todos = true;
  try {
    const { data } = await api.get('/todos');
    todos.value = data.map((todo) => ({
      ...todo,
      statusHistory: (todo.statuses || []).map((status) => ({ ...status })),
      status: getLastStatusName(todo.statuses),
    }));
  } finally {
    loading.todos = false;
  }
};

const saveStatus = async () => {
  const payload = { ...statusForm };
  if (editingStatusId.value) {
    await api.put(`/statuses/${editingStatusId.value}`, payload);
  } else {
    await api.post('/statuses', payload);
  }
  await loadStatuses();
  resetStatusForm();
};

const editStatus = (status) => {
  editingStatusId.value = status._id;
  statusForm.name = status.name;
  statusForm.enableInOrder = status.enableInOrder;
  statusForm.enableInQuotation = status.enableInQuotation;
};

const deleteStatus = async (id) => {
  await api.delete(`/statuses/${id}`);
  await loadStatuses();
};

const resetTodoForm = () => {
  todoForm.title = '';
  todoForm.orderCode = '';
  todoForm.customer = '';
  todoForm.templateId = '';
  todoForm.subTodos = [];
  todoForm.statusHistory = [];
  todoForm.status = '';
  editingTodoId.value = null;
};

const openTodoFromTemplate = (templateId) => {
  const template = todoTemplates.value.find((t) => t._id === templateId);
  if (!template) return;
  todoForm.subTodos = (template.subTodos || []).map((sub) => ({ ...sub, checks: (sub.checks || []).map((check) => ({ ...check })) }));
};

watch(
  () => todoForm.templateId,
  (id) => {
    if (!id) {
      todoForm.subTodos = [];
      return;
    }
    openTodoFromTemplate(id);
  }
);

const saveTodo = async () => {
  const payload = {
    title: todoForm.title,
    orderCode: todoForm.orderCode,
    customer: todoForm.customer,
    orderId: todoForm.orderId,
    templateId: todoForm.templateId,
    subTodos: todoForm.subTodos,
    statuses: buildStatusHistory(todoForm.statusHistory, todoForm.status),
  };
  if (editingTodoId.value) {
    await api.put(`/todos/${editingTodoId.value}`, payload);
  } else {
    await api.post('/todos', payload);
  }
  await loadTodos();
  resetTodoForm();
};

const editTodo = (todo) => {
  editingTodoId.value = todo._id;
  todoForm.title = todo.title;
  todoForm.orderCode = todo.orderCode;
  todoForm.customer = todo.customer;
  todoForm.templateId = todo.templateId || '';
  todoForm.orderId = todo.orderId || '';
  todoForm.subTodos = (todo.subTodos || []).map((sub) => ({ ...sub }));
  const history = (todo.statuses || []).map((status) => ({ ...status }));
  todoForm.statusHistory = history;
  todoForm.status = getLastStatusName(history);
};

const saveExistingTodo = async (todo) => {
  const payload = {
    title: todo.title,
    orderId: todo.orderId,
    orderCode: todo.orderCode,
    customer: todo.customer,
    templateId: todo.templateId,
    subTodos: todo.subTodos,
    statuses: buildStatusHistory(todo.statusHistory || todo.statuses, todo.status),
  };
  await api.put(`/todos/${todo._id}`, payload);
  await loadTodos();
};

const deleteTodo = async (id) => {
  await api.delete(`/todos/${id}`);
  await loadTodos();
};

const loadAssignments = async () => {
  loading.assignments = true;
  try {
    const start = weekStart.value.toISOString().slice(0, 10);
    const endDate = new Date(weekStart.value);
    endDate.setDate(endDate.getDate() + 6);
    const end = endDate.toISOString().slice(0, 10);
    const { data } = await api.get('/assignments', { params: { start, end } });
    assignments.value = data;
  } finally {
    loading.assignments = false;
  }
};

onMounted(async () => {
  await Promise.all([
    loadPersons(),
    loadCustomers(),
    loadDepartments(),
    loadTemplates(),
    loadOrders(),
    loadAssignments(),
    loadStatuses(),
    loadTodoTemplates(),
    loadTodos(),
  ]);
  renderChart();
  renderGantt();
});

watch(
  () => orderForm.templateId,
  (id) => {
    if (!id || editingOrderId.value) return;
    const tpl = templates.value.find((t) => t._id === id);
    if (tpl) {
      orderForm.stages = (tpl.stages || []).map((s) => ({ ...s }));
    }
  }
);

watch(
  () => [persons.value, departments.value],
  () => {
    renderChart();
  },
  { deep: true }
);

watch(
  ganttTasks,
  () => {
    renderGantt();
  },
  { deep: true }
);

watch(
  () => active.value,
  async (val) => {
    if (val === 'gantt') {
      await nextTick();
      renderGantt();
    } else if (val === 'assignments') {
      await nextTick();
      loadAssignments();
    } else if (val === 'statuses') {
      await nextTick();
      loadStatuses();
    }
  }
);
const savePerson = async () => {
  const payload = { ...personForm, hoursPerDayOfTheWeek: personForm.hours };
  delete payload.hours;
  if (editingPersonId.value) {
    await api.put(`/persons/${editingPersonId.value}`, payload);
  } else {
    await api.post('/persons', payload);
  }
  await loadPersons();
  resetPersonForm();
};

const editPerson = (p) => {
  editingPersonId.value = p._id;
  personForm.name = p.name;
  personForm.surname = p.surname;
  personForm.email = p.email;
  personForm.mobile = p.mobile;
  personForm.type = p.type;
  personForm.department = p.department;
  personForm.hours = [...(p.hoursPerDayOfTheWeek || defaultHours)];
};

const deletePerson = async (id) => {
  await api.delete(`/persons/${id}`);
  await loadPersons();
};

const saveCustomer = async () => {
  const payload = { ...customerForm };
  if (editingCustomerId.value) {
    await api.put(`/customers/${editingCustomerId.value}`, payload);
  } else {
    await api.post('/customers', payload);
  }
  await loadCustomers();
  resetCustomerForm();
};

const editCustomer = (c) => {
  editingCustomerId.value = c._id;
  customerForm.name = c.name;
  customerForm.surname = c.surname;
  customerForm.note = c.note;
};

const deleteCustomer = async (id) => {
  await api.delete(`/customers/${id}`);
  await loadCustomers();
};

const saveDepartment = async () => {
  const payload = { ...departmentForm };
  if (editingDepartmentId.value) {
    await api.put(`/departments/${editingDepartmentId.value}`, payload);
  } else {
    await api.post('/departments', payload);
  }
  await loadDepartments();
  resetDepartmentForm();
};

const editDepartment = (d) => {
  editingDepartmentId.value = d._id;
  departmentForm.code = d.code;
  departmentForm.name = d.name;
};

const deleteDepartment = async (id) => {
  await api.delete(`/departments/${id}`);
  await loadDepartments();
};

const addStageToTemplate = () => {
  if (!newStage.name?.trim()) return;
  templateForm.stages = [
    ...templateForm.stages,
    { ...newStage, orderBy: newStage.orderBy || templateForm.stages.length + 1 },
  ];
  newStage.name = '';
  newStage.department = '';
  newStage.percentageOfWork = 0;
  newStage.orderBy = templateForm.stages.length + 1;
  newStage.dueDate = '';
};

const removeTemplateStage = (idx) => {
  templateForm.stages.splice(idx, 1);
};

const saveTemplate = async () => {
  const payload = { ...templateForm };
  if (editingTemplateId.value) {
    await api.put(`/order-templates/${editingTemplateId.value}`, payload);
  } else {
    await api.post('/order-templates', payload);
  }
  await loadTemplates();
  resetTemplateForm();
};

const editTemplate = (t) => {
  editingTemplateId.value = t._id;
  templateForm.name = t.name;
  templateForm.stages = (t.stages || []).map((s) => ({ ...s }));
};

const deleteTemplate = async (id) => {
  await api.delete(`/order-templates/${id}`);
  await loadTemplates();
};

const addStageToOrder = () => {
  if (!newOrderStage.name?.trim()) return;
  orderForm.stages = [
    ...orderForm.stages,
    { ...newOrderStage, orderBy: newOrderStage.orderBy || orderForm.stages.length + 1 },
  ];
  newOrderStage.name = '';
  newOrderStage.department = '';
  newOrderStage.percentageOfWork = 0;
  newOrderStage.orderBy = orderForm.stages.length + 1;
  newOrderStage.dueDate = '';
};

const removeOrderStage = (idx) => {
  orderForm.stages.splice(idx, 1);
};

const saveOrder = async () => {
  const stagesWithHours = (orderForm.stages || []).map((s) => {
    const pct = Number(s.percentageOfWork) || 0;
    const est = Math.round(((pct || 0) / 100) * (Number(orderForm.estimateHours) || 0));
    return { ...s, estimateHours: est };
  });
  const statusesHistory = buildStatusHistory(orderForm.statusHistory, orderForm.status);
  const payload = {
    code: orderForm.code,
    customer: orderForm.customer,
    estimateHours: orderForm.estimateHours,
    dueDate: orderForm.dueDate,
    templateId: orderForm.templateId,
    mediumTermPlan: orderForm.mediumTermPlan,
    stages: stagesWithHours,
    statuses: statusesHistory,
  };
  if (editingOrderId.value) {
    await api.put(`/orders/${editingOrderId.value}`, payload);
  } else {
    await api.post('/orders', payload);
  }
  await loadOrders();
  resetOrderForm();
};

const editOrder = (o) => {
  editingOrderId.value = o._id;
  orderForm.code = o.code;
  orderForm.customer = o.customer;
  const history = (o.statuses || []).map((item) => ({ ...item }));
  orderForm.statusHistory = history;
  orderForm.status = getLastStatusName(history);
  orderForm.estimateHours = o.estimateHours;
  orderForm.dueDate = o.dueDate ? o.dueDate.slice(0, 10) : '';
  orderForm.templateId = o.templateId || '';
  orderForm.stages = (o.stages || []).map((s) => ({ ...s }));
  orderForm.mediumTermPlan = Boolean(o.mediumTermPlan);
};

const deleteOrder = async (id) => {
  await api.delete(`/orders/${id}`);
  await loadOrders();
};

const weekDaysRange = computed(() => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.value);
    d.setDate(weekStart.value.getDate() + i);
    days.push({
      date: d,
      iso: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' }),
    });
  }
  return days;
});

const changeWeek = (delta) => {
  const d = new Date(weekStart.value);
  d.setDate(d.getDate() + delta * 7);
  weekStart.value = getMonday(d);
  loadAssignments();
};

const assignmentsByPersonDate = computed(() => {
  const map = {};
  assignments.value.forEach((a) => {
    const pid = a.personId || 'unknown';
    map[pid] = map[pid] || {};
    map[pid][a.date?.slice(0, 10)] = map[pid][a.date?.slice(0, 10)] || {};
    map[pid][a.date?.slice(0, 10)][a.slot] = map[pid][a.date?.slice(0, 10)][a.slot] || [];
    map[pid][a.date?.slice(0, 10)][a.slot].push(a);
  });
  return map;
});

const resetAssignmentForm = () => {
  assignmentForm.personId = '';
  assignmentForm.orderCode = '';
  assignmentForm.note = '';
  assignmentForm.date = weekStart.value.toISOString().slice(0, 10);
  assignmentForm.slot = 'm1';
  editingAssignmentId.value = null;
};

const resetQuickAssignmentForm = () => {
  quickAssignmentForm.personId = '';
  quickAssignmentForm.orderCode = '';
  quickAssignmentForm.note = '';
  quickAssignmentForm.date = '';
  quickAssignmentForm.slot = '';
};

const openQuickAssign = (personId, dateIso, slot) => {
  quickAssignmentForm.personId = personId;
  quickAssignmentForm.date = dateIso;
  quickAssignmentForm.slot = slot;
  quickAssignmentForm.orderCode = '';
  quickAssignmentForm.note = '';
  quickDialog.value = true;
};

const saveQuickAssignment = async () => {
  const payload = {
    ...quickAssignmentForm,
    personId: quickAssignmentForm.personId,
  };
  await api.post('/assignments', payload);
  quickDialog.value = false;
  resetQuickAssignmentForm();
  await loadAssignments();
};

const saveAssignment = async () => {
  const person = persons.value.find((p) => p._id === assignmentForm.personId);
  const payload = {
    ...assignmentForm,
    personName: person ? `${person.name} ${person.surname || ''}`.trim() : '',
  };
  if (editingAssignmentId.value) {
    await api.put(`/assignments/${editingAssignmentId.value}`, payload);
  } else {
    await api.post('/assignments', payload);
  }
  await loadAssignments();
  resetAssignmentForm();
};

const deleteAssignment = async (id) => {
  await api.delete(`/assignments/${id}`);
  await loadAssignments();
};
</script>

<template>
  <v-app>
    <v-app-bar app color="blue-grey-lighten-4" elevation="1">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-app-bar-title>Falegnameria Planner</v-app-bar-title>
    </v-app-bar>
      <v-navigation-drawer v-model="drawer" app color="blue-grey-lighten-5">
        <v-list dense>
          <v-list-item
            v-for="section in operativeSections"
            :key="section.key"
            :active="active === section.key"
            @click="active = section.key"
          >
            <v-list-item-title>{{ section.title }}</v-list-item-title>
          </v-list-item>
          <v-divider class="my-2" />
          <v-list-item
            v-for="section in configSections"
            :key="section.key"
            :active="active === section.key"
            @click="active = section.key"
          >
            <v-list-item-title>{{ section.title }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>
    <v-main>
      <v-container fluid class="py-6">
        <section v-if="active === 'dashboard'">
          <v-row>
            <v-col cols="12" md="3">
              <v-card elevation="1" class="pa-4">
                <div class="text-h6">Personale</div>
                <div class="text-h4">{{ persons.length }}</div>
                <div class="text-caption text-medium-emphasis">Totale persone registrate</div>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card elevation="1" class="pa-4">
                <div class="text-h6">Clienti</div>
                <div class="text-h4">{{ customers.length }}</div>
                <div class="text-caption text-medium-emphasis">Clienti e contatti</div>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card elevation="1" class="pa-4">
                <div class="text-h6">Ordini</div>
                <div class="text-h4">{{ orders.length }}</div>
                <div class="text-caption text-medium-emphasis">Pianificazione a lungo termine</div>
              </v-card>
            </v-col>
          </v-row>
          <v-row class="mt-4">
            <v-col cols="12" md="8">
              <v-card elevation="1" class="pa-4">
                <div class="text-h6 mb-4">Capacità anno in corso per reparto (ore)</div>
                <canvas ref="chartRef" height="120"></canvas>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card elevation="1" class="pa-4">
                <div class="text-h6 mb-2">Promemoria processo</div>
                <ul>
                  <li>Nuovo potenziale cliente → discussione, preventivo, attesa approvazione</li>
                  <li>Commessa → rilievi, progettazione, esecutivi, IMOS, produzione, montaggio, completamenti</li>
                  <li>Capacità disponibile calcolata sulle ore settimanali del personale interno</li>
                </ul>
              </v-card>
            </v-col>
          </v-row>
        </section>

        <section v-else-if="active === 'persons'">
          <v-card elevation="1" class="pa-4">
            <div class="text-h6 mb-4">Personale</div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="personForm.name" label="Nome" dense hide-details />
                <v-text-field v-model="personForm.surname" label="Cognome" dense hide-details />
                <v-text-field v-model="personForm.email" label="Email" dense hide-details />
                <v-text-field v-model="personForm.mobile" label="Mobile" dense hide-details />
                <v-select
                  v-model="personForm.type"
                  :items="[
                    { title: 'Dipendente interno', value: 'EMP' },
                    { title: 'Esterno', value: 'EXT' },
                  ]"
                  label="Tipo"
                  dense
                  hide-details
                />
                <v-autocomplete
                  v-model="personForm.department"
                  :items="departmentOptions"
                  label="Reparto"
                  dense
                  hide-details
                  clearable
                />
                <v-table density="comfortable" class="mt-3">
                  <thead>
                    <tr>
                      <th>Giorno</th>
                      <th style="width: 140px">Ore</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(day, idx) in weekDays" :key="day">
                      <td>{{ day }}</td>
                      <td>
                        <v-text-field
                          v-model.number="personForm.hours[idx]"
                          type="number"
                          density="compact"
                          hide-details
                          min="0"
                        />
                      </td>
                    </tr>
                  </tbody>
                </v-table>
                <v-btn color="primary" class="mt-3 me-2" @click="savePerson">
                  {{ editingPersonId ? 'Aggiorna' : 'Crea' }}
                </v-btn>
                <v-btn variant="text" class="mt-3" @click="resetPersonForm">Reset</v-btn>
              </v-col>
              <v-col cols="12" md="6">
                <v-data-table
                  :items="persons"
                  :headers="[
                    { title: 'Nome', value: 'name' },
                    { title: 'Cognome', value: 'surname' },
                    { title: 'Tipo', value: 'type' },
                    { title: 'Reparto', value: 'department' },
                    { title: 'Ore', value: 'hoursPerDayOfTheWeek' },
                    { title: 'Azioni', value: 'actions', sortable: false },
                  ]"
                  :loading="loading.persons"
                >
                  <template #item.hoursPerDayOfTheWeek="{ item }">
                    {{ item.hoursPerDayOfTheWeek?.join(', ') }}
                  </template>
                  <template #item.actions="{ item }">
                    <v-btn size="small" variant="text" @click="editPerson(item)">Modifica</v-btn>
                    <v-btn size="small" variant="text" color="red" @click="deletePerson(item._id)">Elimina</v-btn>
                  </template>
                </v-data-table>
              </v-col>
            </v-row>
          </v-card>
        </section>

        <section v-else-if="active === 'customers'">
          <v-card elevation="1" class="pa-4">
            <div class="text-h6 mb-4">Clienti</div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="customerForm.name" label="Nome" dense hide-details />
                <v-text-field v-model="customerForm.surname" label="Cognome" dense hide-details />
                <v-textarea v-model="customerForm.note" label="Note" rows="2" />
                <v-btn color="primary" class="mt-3 me-2" @click="saveCustomer">
                  {{ editingCustomerId ? 'Aggiorna' : 'Crea' }}
                </v-btn>
                <v-btn variant="text" class="mt-3" @click="resetCustomerForm">Reset</v-btn>
              </v-col>
              <v-col cols="12" md="6">
                <v-data-table
                  :items="customers"
                  :headers="[
                    { title: 'Nome', value: 'name' },
                    { title: 'Cognome', value: 'surname' },
                    { title: 'Note', value: 'note' },
                    { title: 'Azioni', value: 'actions', sortable: false },
                  ]"
                  :loading="loading.customers"
                >
                  <template #item.actions="{ item }">
                    <v-btn size="small" variant="text" @click="editCustomer(item)">Modifica</v-btn>
                    <v-btn size="small" variant="text" color="red" @click="deleteCustomer(item._id)">Elimina</v-btn>
                  </template>
                </v-data-table>
              </v-col>
            </v-row>
          </v-card>
        </section>

        <section v-else-if="active === 'departments'">
          <v-card elevation="1" class="pa-4">
            <div class="text-h6 mb-4">Reparti</div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="departmentForm.code" label="Codice" dense hide-details />
                <v-text-field v-model="departmentForm.name" label="Nome" dense hide-details />
                <v-btn color="primary" class="mt-3 me-2" @click="saveDepartment">
                  {{ editingDepartmentId ? 'Aggiorna' : 'Crea' }}
                </v-btn>
                <v-btn variant="text" class="mt-3" @click="resetDepartmentForm">Reset</v-btn>
              </v-col>
              <v-col cols="12" md="6">
                <v-data-table
                  :items="departments"
                  :headers="[
                    { title: 'Codice', value: 'code' },
                    { title: 'Nome', value: 'name' },
                    { title: 'Azioni', value: 'actions', sortable: false },
                  ]"
                  :loading="loading.departments"
                >
                  <template #item.actions="{ item }">
                    <v-btn size="small" variant="text" @click="editDepartment(item)">Modifica</v-btn>
                    <v-btn size="small" variant="text" color="red" @click="deleteDepartment(item._id)">Elimina</v-btn>
                  </template>
                </v-data-table>
              </v-col>
            </v-row>
          </v-card>
        </section>

        <section v-else-if="active === 'templates'">
          <v-card elevation="1" class="pa-4">
            <div class="text-h6 mb-4">Template Ordini</div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="templateForm.name" label="Nome template" dense hide-details />
                <v-row class="mt-2" align="center">
                  <v-col cols="12" md="3">
                    <v-text-field v-model="newStage.name" label="Fase" dense hide-details />
                  </v-col>
                  <v-col cols="12" md="2">
                    <v-autocomplete
                      v-model="newStage.department"
                      :items="departmentOptions"
                      label="Reparto"
                      dense
                      hide-details
                      clearable
                    />
                  </v-col>
                  <v-col cols="12" md="2">
                    <v-text-field
                      v-model.number="newStage.percentageOfWork"
                      label="%"
                      type="number"
                      dense
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="2">
                    <v-text-field
                      v-model.number="newStage.orderBy"
                      label="Ordine"
                      type="number"
                      dense
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-text-field
                      v-model="newStage.dueDate"
                      label="Scadenza fase"
                      type="date"
                      dense
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-btn color="primary" size="small" @click="addStageToTemplate">Aggiungi fase</v-btn>
                  </v-col>
                </v-row>
                <v-chip-group class="my-2" column>
                  <v-chip
                    v-for="(stage, idx) in templateForm.stages"
                    :key="idx"
                    variant="flat"
                    color="blue-grey-lighten-3"
                    class="ma-1"
                  >
                    #{{ stage.orderBy || idx + 1 }} {{ stage.name }} - {{ stage.department }} ({{ stage.percentageOfWork
                    }}%) {{ stage.dueDate ? '• ' + stage.dueDate.slice(0, 10) : '' }}
                    <v-btn icon size="x-small" variant="text" @click="removeTemplateStage(idx)">
                      <v-icon icon="mdi-close" size="16" />
                    </v-btn>
                  </v-chip>
                </v-chip-group>
                <v-btn color="primary" class="mt-3 me-2" @click="saveTemplate">
                  {{ editingTemplateId ? 'Aggiorna' : 'Crea' }}
                </v-btn>
                <v-btn variant="text" class="mt-3" @click="resetTemplateForm">Reset</v-btn>
              </v-col>
              <v-col cols="12" md="6">
                <v-data-table
                  :items="templates"
                  :headers="[
                    { title: 'Nome', value: 'name' },
                    { title: 'Fasi', value: 'stages' },
                    { title: 'Azioni', value: 'actions', sortable: false },
                  ]"
                  :loading="loading.templates"
                >
                  <template #item.stages="{ item }">
                    <div class="text-caption">
                      <div v-for="stage in item.stages" :key="stage.name">
                        {{ stage.name }} ({{ stage.percentageOfWork }}%) {{ stage.dueDate ? ' - ' + stage.dueDate.slice(0, 10) : '' }}
                      </div>
                    </div>
                  </template>
                  <template #item.actions="{ item }">
                    <v-btn size="small" variant="text" @click="editTemplate(item)">Modifica</v-btn>
                    <v-btn size="small" variant="text" color="red" @click="deleteTemplate(item._id)">Elimina</v-btn>
                  </template>
                </v-data-table>
              </v-col>
            </v-row>
          </v-card>
        </section>

        <section v-else-if="active === 'orders'">
          <v-card elevation="1" class="pa-4">
            <div class="text-h6 mb-4">Ordini</div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="orderForm.code" label="Codice" dense hide-details />
                <v-autocomplete
                  v-model="orderForm.customer"
                  :items="customerOptions"
                  label="Cliente"
                  dense
                  hide-details
                  clearable
                />
                <v-select
                  v-model="orderForm.status"
                  :items="orderStatusOptions.map((s) => ({ title: s.name, value: s.name }))"
                  label="Stato"
                  dense
                  hide-details
                  clearable
                />
                <v-text-field
                  v-model.number="orderForm.estimateHours"
                  label="Ore stimate"
                  type="number"
                  dense
                  hide-details
                />
                <v-text-field
                  v-model="orderForm.dueDate"
                  label="Scadenza ordine"
                  type="date"
                  dense
                  hide-details
                />
                <v-select
                  v-model="orderForm.templateId"
                  :items="templates.map((t) => ({ title: t.name, value: t._id }))"
                  label="Applica template"
                  dense
                  hide-details
                  clearable
                />
                <v-switch
                  v-model="orderForm.mediumTermPlan"
                  label="Pianificazione medio termine"
                  inset
                  hide-details
                />
                <v-row class="mt-2" align="center">
                  <v-col cols="12" md="3">
                    <v-text-field v-model="newOrderStage.name" label="Fase" dense hide-details />
                  </v-col>
                  <v-col cols="12" md="2">
                    <v-autocomplete
                      v-model="newOrderStage.department"
                      :items="departmentOptions"
                      label="Reparto"
                      dense
                      hide-details
                      clearable
                    />
                  </v-col>
                  <v-col cols="12" md="2">
                    <v-text-field
                      v-model.number="newOrderStage.percentageOfWork"
                      label="%"
                      type="number"
                      dense
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="2">
                    <v-text-field
                      v-model.number="newOrderStage.orderBy"
                      label="Ordine"
                      type="number"
                      dense
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-text-field
                      v-model="newOrderStage.dueDate"
                      label="Scadenza fase"
                      type="date"
                      dense
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="2">
                    <v-btn color="primary" size="small" @click="addStageToOrder">Aggiungi fase</v-btn>
                  </v-col>
                </v-row>
                <v-chip-group class="my-2" column>
                  <v-chip
                    v-for="(stage, idx) in orderForm.stages"
                    :key="idx"
                    variant="flat"
                    color="blue-grey-lighten-3"
                    class="ma-1"
                  >
                    #{{ stage.orderBy || idx + 1 }} {{ stage.name }} - {{ stage.department }} ({{ stage.percentageOfWork
                    }}%) — {{ stage.estimateHours || 0 }}h {{ stage.dueDate ? '• ' + stage.dueDate.slice(0, 10) : '' }}
                    <v-btn icon size="x-small" variant="text" @click="removeOrderStage(idx)">
                      <v-icon icon="mdi-close" size="16" />
                    </v-btn>
                  </v-chip>
                </v-chip-group>
                <v-btn color="primary" class="mt-3 me-2" @click="saveOrder">
                  {{ editingOrderId ? 'Aggiorna' : 'Crea' }}
                </v-btn>
                <v-btn variant="text" class="mt-3" @click="resetOrderForm">Reset</v-btn>
              </v-col>
              <v-col cols="12" md="6">
                <v-data-table
                  :items="orders"
                  :headers="[
                    { title: 'Codice', value: 'code' },
                    { title: 'Cliente', value: 'customer' },
                    { title: 'Ore', value: 'estimateHours' },
                    { title: 'Scadenza', value: 'dueDate' },
                    { title: 'Stato', value: 'status' },
                    { title: 'Fasi', value: 'stages' },
                    { title: 'Azioni', value: 'actions', sortable: false },
                  ]"
                  :loading="loading.orders"
                >
                  <template #item.dueDate="{ item }">
                    {{ item.dueDate ? item.dueDate.slice(0, 10) : '' }}
                  </template>
                  <template #item.status="{ item }">
                    <div>{{ getLastStatusName(item.statuses) || '—' }}</div>
                    <div class="text-caption">{{ getLastStatusDate(item.statuses) }}</div>
                  </template>
                  <template #item.stages="{ item }">
                    <div class="text-caption">
                      <div v-for="stage in item.stages" :key="stage.name">
                        #{{ stage.orderBy || '' }} {{ stage.name }} ({{ stage.percentageOfWork }}%) — {{ stage.estimateHours ||
                        0 }}h {{ stage.dueDate ? ' - ' + stage.dueDate.slice(0, 10) : '' }}
                      </div>
                    </div>
                  </template>
                  <template #item.actions="{ item }">
                    <v-btn size="small" variant="text" @click="editOrder(item)">Modifica</v-btn>
                    <v-btn size="small" variant="text" color="red" @click="deleteOrder(item._id)">Elimina</v-btn>
                  </template>
                </v-data-table>
              </v-col>
            </v-row>
          </v-card>
        </section>

        <section v-else-if="active === 'kanban'">
          <v-card elevation="1" class="pa-4">
            <div class="text-h6 mb-4">Kanban ordini</div>
            <v-row class="gap-3 mt-4">
              <v-col
                v-for="column in kanbanColumns"
                :key="column.keyField"
                cols="12"
                md="3"
                class="d-flex"
              >
                <v-card class="w-100" outlined>
                  <v-card-title class="d-flex justify-space-between align-center">
                    <span>{{ column.headerText }}</span>
                    <v-chip small>{{ (ordersByStatus[column.keyField] || []).length }}</v-chip>
                  </v-card-title>
                  <v-card-text class="pt-0">
                    <div
                      v-for="order in ordersByStatus[column.keyField] || []"
                      :key="order._id"
                      class="mb-3 px-2 py-1 rounded-3"
                      style="background:#f5f5f5"
                    >
                      <div class="text-subtitle-2 font-weight-medium">{{ order.code }}</div>
                      <div class="text-caption mb-1">{{ order.customer }}</div>
                      <div class="text-caption">Ore {{ order.estimateHours || 0 }}</div>
                      <div class="text-caption">Scadenza {{ order.dueDate ? order.dueDate.slice(0, 10) : '—' }}</div>
                    </div>
                    <div v-if="!(ordersByStatus[column.keyField] || []).length" class="text-caption text-center">
                      Nessuna commessa
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card>
        </section>

        <section v-else-if="active === 'todoTemplates'">
          <v-card elevation="1" class="pa-4">
            <div class="text-h6 mb-3">Todo Template</div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="todoTemplateForm.title" label="Titolo template" dense hide-details />
                <v-divider class="my-3" />
                <div class="text-subtitle-1 mb-2">Sotto attività</div>
                <v-row v-for="(sub, idx) in todoTemplateForm.subTodos" :key="idx">
                  <v-col cols="12">
                    <v-card outlined class="pa-2 mb-2">
                      <div class="d-flex justify-space-between align-center">
                        <div>
                          <div class="text-body-2 fw-bold">{{ sub.description }}</div>
                          <div class="text-caption">
                            {{ sub.assignedToName || personNameFromId(sub.assignedTo) || 'Non assegnato' }}
                          </div>
                          <div v-if="sub.checks?.length" class="text-caption mt-1">
                            <span v-for="(check, cidx) in sub.checks" :key="`${idx}-${cidx}`">
                              {{ check.name }}{{ check.emailNotification ? ' (mail)' : '' }}
                              <span v-if="check.deadline"> - {{ check.deadline.slice(0, 10) }}</span>
                              <span v-if="cidx !== sub.checks.length - 1">•</span>
                            </span>
                          </div>
                        </div>
                        <v-btn icon size="small" @click="removeTemplateSub(idx)">
                          <v-icon icon="mdi-delete" />
                        </v-btn>
                      </div>
                    </v-card>
                  </v-col>
                </v-row>
                <v-row class="mb-2" align="center">
                  <v-col cols="12" md="6">
                    <v-text-field v-model="newTodoSub.description" label="Descrizione" dense hide-details />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="newTodoSub.assignedTo"
                      :items="persons.map((p) => ({ title: `${p.name} ${p.surname || ''}`, value: p._id }))"
                      label="Assegna a"
                      dense
                      hide-details
                      clearable
                    />
                  </v-col>
                </v-row>
                <v-row class="mb-2" align="center">
                  <v-col cols="12" md="5">
                    <v-text-field v-model="newTodoCheck.name" label="Check list item" dense hide-details />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-switch
                      v-model="newTodoCheck.emailNotification"
                      label="Notifica email"
                      inset
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="3" class="text-end">
                    <v-btn size="small" color="primary" @click="addTemplateCheck">Aggiungi check</v-btn>
                  </v-col>
                </v-row>
                <v-row class="mb-2" align="center">
                  <v-col cols="12" md="4">
                    <v-text-field v-model="newTodoCheck.deadline" label="Scadenza check" type="date" dense hide-details />
                  </v-col>
                </v-row>
                <v-row v-if="newTodoSub.checks?.length" class="mb-2">
                  <v-col cols="12">
                    <div class="text-caption mb-1">Check correnti:</div>
                    <v-chip-group column>
                      <v-chip
                        v-for="(check, idx) in newTodoSub.checks"
                        :key="idx"
                        small
                        class="ma-1"
                      >
                        {{ check.name }} <span v-if="check.emailNotification">(mail)</span>
                      </v-chip>
                    </v-chip-group>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col cols="12" class="text-end">
                    <v-btn size="small" color="primary" @click="addTemplateSub">Aggiungi sotto attività</v-btn>
                  </v-col>
                </v-row>
                <v-btn color="primary" class="mt-2 me-2" @click="saveTodoTemplate">
                  {{ editingTodoTemplateId ? 'Aggiorna' : 'Crea' }}
                </v-btn>
                <v-btn variant="text" class="mt-2" @click="resetTodoTemplateForm">Reset</v-btn>
              </v-col>
              <v-col cols="12" md="6">
                <v-data-table
                  :items="todoTemplates"
                  :headers="[
                    { title: 'Titolo', value: 'title' },
                    { title: 'Sub Todo', value: 'subTodos' },
                    { title: 'Azioni', value: 'actions', sortable: false },
                  ]"
                  :loading="loading.todoTemplates"
                >
                <template #item.subTodos="{ item }">
                  <div class="text-caption">
                    <div v-for="sub in item.subTodos" :key="sub.description">
                        <div>{{ sub.description }} — {{ sub.assignedToName || getPersonLabel(sub.assignedTo) || 'Nessuno' }}</div>
                        <div v-if="sub.checks?.length" class="text-caption ms-3">
                          <span v-for="check in sub.checks" :key="check.name">
                            {{ check.name }}{{ check.emailNotification ? ' (mail) ' : ', ' }}
                          </span>
                        </div>
                    </div>
                  </div>
                </template>
                  <template #item.actions="{ item }">
                    <v-btn size="small" variant="text" @click="editTodoTemplate(item)">Modifica</v-btn>
                    <v-btn size="small" variant="text" color="red" @click="deleteTodoTemplate(item._id)">Elimina</v-btn>
                  </template>
                </v-data-table>
              </v-col>
            </v-row>
          </v-card>
        </section>

        <section v-else-if="active === 'todos'">
          <v-card elevation="1" class="pa-4">
            <div class="d-flex justify-space-between align-center mb-3">
              <div class="text-h6">Todo</div>
              <v-btn color="primary" @click="todoDialog = true">Nuovo Todo</v-btn>
            </div>
            <div v-for="todo in todos" :key="todo._id" class="mb-4">
              <v-card outlined class="pa-3">
                <v-row class="align-center" dense>
                  <v-col cols="12" md="3">
                    <v-text-field v-model="todo.title" label="Titolo" dense hide-details />
                  </v-col>
                  <v-col cols="12" md="2">
                    <v-select
                      v-model="todo.orderId"
                      :items="orderSelectOptions"
                      label="Ordine"
                      dense
                      hide-details
                      clearable
                    />
                  </v-col>
                  <v-col cols="12" md="2">
                    <v-text-field v-model="todo.customer" label="Cliente" dense hide-details />
                  </v-col>
                  <v-col cols="12" md="2">
                    <v-select
                      v-model="todo.status"
                      :items="orderStatusOptions.map((status) => ({ title: status.name, value: status.name }))"
                      label="Stato"
                      dense
                      hide-details
                      clearable
                    />
                  </v-col>
                  <v-col cols="12" md="3" class="text-end">
                    <v-btn size="small" color="primary" @click="saveExistingTodo(todo)">Salva</v-btn>
                    <v-btn size="small" variant="text" color="red" @click="deleteTodo(todo._id)">Elimina</v-btn>
                  </v-col>
                </v-row>
                <div v-for="(sub, idx) in todo.subTodos" :key="idx" class="mt-3">
                  <v-card class="pa-3" outlined>
                    <div class="d-flex justify-space-between">
                      <div>
                        <div class="text-body-2 fw-bold">{{ sub.description }}</div>
                        <div class="text-caption">
                          {{ sub.assignedToName || personNameFromId(sub.assignedTo) || 'Non assegnato' }}
                        </div>
                      </div>
                      <div class="d-flex align-center gap-2">
                        <v-checkbox v-model="sub.done" label="Completata" />
                        <div v-for="(check, cidx) in sub.checks" :key="`${idx}-${cidx}`" class="d-flex align-center gap-2">
                          <v-checkbox v-model="check.completed" :label="check.name" class="me-2" />
                          <v-text-field
                            v-model="check.deadline"
                            type="date"
                            label="Deadline"
                            dense
                            hide-details
                          />
                          <span v-if="check.emailNotification" class="text-caption">(mail)</span>
                        </div>
                      </div>
                    </div>
                  </v-card>
                </div>
              </v-card>
            </div>
          </v-card>
          <v-dialog v-model="todoDialog" max-width="600">
            <v-card>
              <v-card-title>Nuovo Todo</v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="todoForm.title" label="Titolo" dense hide-details />
                    <v-select
                      v-model="todoForm.orderId"
                      :items="orderSelectOptions"
                      label="Ordine"
                      dense
                      hide-details
                      clearable
                    />
                    <v-text-field v-model="todoForm.customer" label="Cliente" dense hide-details />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="todoForm.templateId"
                      :items="todoTemplates.map((tpl) => ({ title: tpl.title, value: tpl._id }))"
                      label="Applica template"
                      dense
                      hide-details
                      clearable
                    />
                    <v-select
                      v-model="todoForm.status"
                      :items="orderStatusOptions.map((status) => ({ title: status.name, value: status.name }))"
                      label="Stato"
                      dense
                      hide-details
                      clearable
                    />
                  </v-col>
                </v-row>
                <div v-if="todoForm.subTodos.length">
                  <div class="text-subtitle-1 mb-2">Sub Todo</div>
                  <v-chip-group column>
                    <v-chip
                      v-for="(sub, idx) in todoForm.subTodos"
                      :key="idx"
                      class="mb-1"
                      color="grey lighten-3"
                      text-color="black"
                    >
                      {{ sub.description }} — {{ sub.assignedToName || personNameFromId(sub.assignedTo) || 'Nessuno' }}
                    </v-chip>
                  </v-chip-group>
                </div>
              </v-card-text>
              <v-card-actions>
                <v-spacer />
                <v-btn text @click="todoDialog = false; resetTodoForm()">Annulla</v-btn>
                <v-btn color="primary" @click="saveTodo">Salva</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </section>

        <section v-else-if="active === 'statuses'">
          <v-card elevation="1" class="pa-4">
            <div class="text-h6 mb-4">Stati</div>
            <v-row class="align-center">
              <v-col cols="12" md="4">
                <v-text-field v-model="statusForm.name" label="Nome stato" dense hide-details />
              </v-col>
              <v-col cols="12" md="4">
                <v-switch
                  v-model="statusForm.enableInOrder"
                  label="Usato negli ordini"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-switch
                  v-model="statusForm.enableInQuotation"
                  label="Usato nei preventivi"
                  hide-details
                />
              </v-col>
            </v-row>
            <v-btn color="primary" class="mt-3 me-2" @click="saveStatus">
              {{ editingStatusId ? 'Aggiorna' : 'Crea' }}
            </v-btn>
            <v-btn variant="text" class="mt-3" @click="resetStatusForm">Reset</v-btn>
            <v-data-table
              class="mt-4"
              :items="statuses"
              :headers="[
                { title: 'Nome', value: 'name' },
                { title: 'Ordini', value: 'enableInOrder' },
                { title: 'Preventivi', value: 'enableInQuotation' },
                { title: 'Azioni', value: 'actions', sortable: false },
              ]"
              :loading="loading.statuses"
            >
              <template #item.enableInOrder="{ item }">
                <v-chip size="small" :color="item.enableInOrder ? 'success' : 'grey'">
                  {{ item.enableInOrder ? 'Sì' : 'No' }}
                </v-chip>
              </template>
              <template #item.enableInQuotation="{ item }">
                <v-chip size="small" :color="item.enableInQuotation ? 'success' : 'grey'">
                  {{ item.enableInQuotation ? 'Sì' : 'No' }}
                </v-chip>
              </template>
              <template #item.actions="{ item }">
                <v-btn size="small" variant="text" @click="editStatus(item)">Modifica</v-btn>
                <v-btn size="small" variant="text" color="red" @click="deleteStatus(item._id)">Elimina</v-btn>
              </template>
            </v-data-table>
          </v-card>
        </section>

        <section v-else-if="active === 'assignments'">
          <v-card elevation="1" class="pa-4">
            <div class="text-h6 mb-4">Assegnazioni settimanali</div>
            <v-row class="mb-3" align="center">
              <v-col cols="12" md="4">
                <v-btn size="small" class="me-2" @click="changeWeek(-1)">Settimana precedente</v-btn>
                <v-btn size="small" variant="text" class="me-2" @click="weekStart = getMonday(new Date()); loadAssignments();">Oggi</v-btn>
                <v-btn size="small" @click="changeWeek(1)">Settimana successiva</v-btn>
              </v-col>
              <v-col cols="12" md="8" class="text-right text-caption">
                {{ weekDaysRange[0].label }} - {{ weekDaysRange[6].label }}
              </v-col>
            </v-row>

            <v-card class="pa-4 mb-4" color="blue-grey-lighten-5" variant="tonal">
              <div class="text-subtitle-1 mb-2">Nuova assegnazione</div>
              <v-row>
                <v-col cols="12" md="3">
                  <v-select
                    v-model="assignmentForm.personId"
                    :items="persons.map((p) => ({ title: `${p.name} ${p.surname || ''}`, value: p._id }))"
                    label="Persona"
                    dense
                    hide-details
                    clearable
                  />
                </v-col>
                <v-col cols="12" md="2">
                  <v-autocomplete
                    v-model="assignmentForm.orderCode"
                    :items="orders.map((o) => o.code)"
                    label="Commessa (opzionale)"
                    dense
                    hide-details
                    clearable
                  />
                </v-col>
                <v-col cols="12" md="3">
                  <v-text-field v-model="assignmentForm.note" label="Nota" dense hide-details />
                </v-col>
                <v-col cols="12" md="2">
                  <v-text-field v-model="assignmentForm.date" type="date" label="Data" dense hide-details />
                </v-col>
                <v-col cols="12" md="2">
                  <v-select
                    v-model="assignmentForm.slot"
                    :items="slotOptions"
                    label="Slot"
                    dense
                    hide-details
                  />
                </v-col>
              </v-row>
              <v-btn color="primary" class="mt-2 me-2" @click="saveAssignment">
                {{ editingAssignmentId ? 'Aggiorna' : 'Aggiungi' }}
              </v-btn>
              <v-btn variant="text" class="mt-2" @click="resetAssignmentForm">Reset</v-btn>
            </v-card>

            <v-dialog v-model="quickDialog" max-width="480">
              <v-card>
                <v-card-title>Assegna slot rapido</v-card-title>
                <v-card-text>
                  <v-select
                    v-model="quickAssignmentForm.personId"
                    :items="persons.map((p) => ({ title: `${p.name} ${p.surname || ''}`, value: p._id }))"
                    label="Persona"
                    dense
                    hide-details
                  />
                  <v-select
                    v-model="quickAssignmentForm.orderCode"
                    :items="orderOptions.map((o) => ({ title: o.title, value: o.value }))"
                    label="Commessa (opzionale)"
                    dense
                    hide-details
                    clearable
                  />
                  <v-text-field
                    v-model="quickAssignmentForm.note"
                    label="Nota"
                    dense
                    hide-details
                  />
                  <v-text-field
                    v-model="quickAssignmentForm.date"
                    label="Data"
                    type="date"
                    dense
                    hide-details
                  />
                  <v-select
                    v-model="quickAssignmentForm.slot"
                    :items="slotOptions"
                    label="Slot"
                    dense
                    hide-details
                  />
                </v-card-text>
                <v-card-actions>
                  <v-spacer />
                  <v-btn variant="text" @click="quickDialog = false; resetQuickAssignmentForm()">Annulla</v-btn>
                  <v-btn color="primary" @click="saveQuickAssignment">Salva</v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>

            <v-table density="comfortable">
              <thead>
                <tr>
                  <th style="width: 160px">Persona</th>
                  <th v-for="day in weekDaysRange" :key="day.iso">{{ day.label }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="person in persons" :key="person._id">
                  <td class="text-body-2">{{ person.name }} {{ person.surname }}</td>
                  <td v-for="day in weekDaysRange" :key="day.iso" style="min-width: 180px">
                    <div class="d-flex flex-column gap-1">
                      <div v-for="slot in slotOptions" :key="slot.value" class="d-flex align-center">
                        <div class="text-caption" style="width: 98px">{{ slot.title }}</div>
                        <div class="flex-grow-1">
                          <v-chip-group column class="ma-0 pa-0">
                            <v-chip
                              v-for="a in (assignmentsByPersonDate[person._id]?.[day.iso]?.[slot.value] || [])"
                              :key="a._id"
                              size="small"
                              color="blue-grey-lighten-3"
                              class="ma-1"
                            >
                              {{ a.orderCode || 'nota' }} {{ a.note ? ' - ' + a.note : '' }}
                              <v-btn icon size="x-small" variant="text" color="red" @click="deleteAssignment(a._id)">
                                <v-icon icon="mdi-close" size="14" />
                              </v-btn>
                            </v-chip>
                          </v-chip-group>
                          <div v-if="!(assignmentsByPersonDate[person._id]?.[day.iso]?.[slot.value] || []).length" class="text-right">
                            <v-btn size="x-small" variant="text" @click="openQuickAssign(person._id, day.iso, slot.value)">
                              Assegna
                            </v-btn>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card>
        </section>

        <section v-else-if="active === 'gantt'">
          <v-card elevation="1" class="pa-4">
            <div class="text-h6 mb-4">Gantt ordini</div>
            <div ref="ganttContainer" style="overflow-x: auto; min-height: 320px;"></div>
            <div class="text-caption mt-2">
              Le barre sono calcolate in sequenza partendo dalla scadenza dell'ordine, durata stimata = ore fase / 8h.
            </div>
          </v-card>
        </section>

      </v-container>
    </v-main>
  </v-app>
</template>
