// tools.js — tool management with PHP backend
const Tools = (() => {
  let tools = [];
  const API = 'tools.php';

  async function load() {
    try {
      const res = await fetch(API);
      tools = await res.json();
    } catch(e) {
      console.warn('Tool load failed, using empty list', e);
      tools = [];
    }
    return tools;
  }

  async function save() {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tools)
      });
      return await res.json();
    } catch(e) {
      console.error('Tool save failed', e);
      return { error: 'save failed' };
    }
  }

  function getAll() { return tools; }
  function getById(id) { return tools.find(t => t.id === id); }

  function add(tool) {
    // Auto ID
    if (!tool.id) {
      let n = 1;
      while (tools.find(t => t.id === 'T'+n)) n++;
      tool.id = 'T'+n;
    }
    tools.push(tool);
    return tool;
  }

  function update(id, data) {
    const t = getById(id);
    if (t) Object.assign(t, data);
    return t;
  }

  function remove(id) {
    const i = tools.findIndex(t => t.id === id);
    if (i >= 0) tools.splice(i, 1);
  }

  function newTool() {
    return {
      id: '', name: 'Neuer Fräser', type: 'endmill',
      diameter: 10, length: 50, flutes: 4,
      cutData: { feed: 800, speed: 3000, maxCutHeight: 3, coolant: true }
    };
  }

  return { load, save, getAll, getById, add, update, remove, newTool };
})();
