// rules.js
(function() {
  'use strict';

  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '')
    ? 'http://localhost:4000'
    : '';
  let rules = [];
  
  // DOM Elements
  const rulesList = document.getElementById("rulesList");
  const ruleFormContainer = document.getElementById("ruleFormContainer");
  const ruleFormTitle = document.getElementById("ruleFormTitle");
  const ruleForm = document.getElementById("ruleForm");
  const ruleId = document.getElementById("ruleId");
  const ruleName = document.getElementById("ruleName");
  const ruleDescription = document.getElementById("ruleDescription");
  
  console.log("🔍 JavaScript loaded - DOM elements:", {
    rulesList: !!rulesList,
    ruleForm: !!ruleForm,
    ruleName: !!ruleName,
  });
  
  /* -------------------------------------------------------------------------- */
  /*                              Rules Management                              */
  /* -------------------------------------------------------------------------- */
  
  /** Load and display all rules in the table */
  function loadRules() {
    console.log("🔄 loadRules() called, rules count:", rules.length);
  
    if (rules.length === 0) {
      rulesList.innerHTML = `
        <tr>
          <td colspan="3" class="text-center text-muted py-4">
            <i class="bi bi-inbox fs-1"></i>
            <p>No rules defined yet. Click "Add New Rule" to get started.</p>
          </td>
        </tr>`;
      console.log("📭 No rules to display");
      return;
    }
  
    rulesList.innerHTML = rules
      .map(
        (rule) => `
          <tr class="rule-item">
            <td class="fw-bold">${rule.rule_name}</td>
            <td>${rule.rule_description}</td>
            <td>
              <div class="rule-actions">
                <button class="btn btn-sm btn-outline-primary me-1" 
                  onclick="editRule('${rule._id}')" title="Edit Rule">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" 
                  onclick="deleteRule('${rule._id}')" title="Delete Rule">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </td>
          </tr>`
      )
      .join("");
  
    console.log("✅ Rules displayed in table");
  }
  
  /** Show the add rule form */
  function showAddRuleForm() {
    console.log("🔄 showAddRuleForm() called");
    ruleFormContainer.style.display = "block";
    ruleFormTitle.textContent = "Add New Rule";
    ruleForm.reset();
    ruleId.value = "";
    ruleFormContainer.scrollIntoView({ behavior: "smooth" });
  }
  
  /** Hide the rule form */
  function hideRuleForm() {
    ruleFormContainer.style.display = "none";
  }
  
  /** Edit an existing rule */
  function editRule(ruleIdParam) {
    console.log("🔄 editRule() called:", ruleIdParam);
    const rule = rules.find((r) => r._id === ruleIdParam);
    if (!rule) {
      alert("Rule not found!");
      return;
    }
  
    ruleFormContainer.style.display = "block";
    ruleFormTitle.textContent = "Edit Rule";
    ruleId.value = rule._id;
    ruleName.value = rule.rule_name;
    ruleDescription.value = rule.rule_description;
    ruleFormContainer.scrollIntoView({ behavior: "smooth" });
  }
  
  /** Save rule (create or update) */
  async function saveRule() {
    console.log("🔄 saveRule() called");
    const id = ruleId.value;
    const name = ruleName.value.trim();
    const description = ruleDescription.value.trim();
  
    if (!name || !description) {
      alert("Please fill in all required fields (Rule Name and Description)");
      return;
    }
  
    if (name.length > 100) {
      alert("Rule name cannot exceed 100 characters");
      return;
    }
  
    if (description.length > 500) {
      alert("Rule description cannot exceed 500 characters");
      return;
    }
  
    const ruleData = {
      rule_name: name,
      rule_description: description,
    };
  
    try {
      if (id) {
        await updateRule(id, ruleData);
      } else {
        await createRule(ruleData);
      }
    } catch (error) {
      showNotification("Error saving rule: " + error.message, "error");
    }
  }
  
  /** Create a new rule */
  async function createRule(ruleData) {
    try {
      console.log("📤 Creating rule:", ruleData);
      const response = await fetch(`${API_BASE}/api/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleData),
      });
  
      const data = await response.json();
      console.log("📥 Create response:", data);
  
      if (data.success) {
        await fetchRulesFromAPI();
        hideRuleForm();
        showNotification("Rule added successfully!", "success");
      } else throw new Error(data.error);
    } catch (error) {
      showNotification("Error creating rule: " + error.message, "error");
    }
  }
  
  /** Update an existing rule */
  async function updateRule(ruleIdParam, ruleData) {
    try {
      console.log("📤 Updating rule:", ruleIdParam, ruleData);
      const response = await fetch(`${API_BASE}/api/rules/${ruleIdParam}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleData),
      });
  
      const data = await response.json();
      console.log("📥 Update response:", data);
  
      if (data.success) {
        await fetchRulesFromAPI();
        hideRuleForm();
        showNotification("Rule updated successfully!", "success");
      } else throw new Error(data.error);
    } catch (error) {
      showNotification("Error updating rule: " + error.message, "error");
    }
  }
  
  /** Delete a rule */
  async function deleteRule(ruleIdParam) {
    if (!confirm("Are you sure you want to delete this rule?")) return;
  
    try {
      console.log("🗑️ Deleting rule:", ruleIdParam);
      const response = await fetch(`${API_BASE}/api/rules/${ruleIdParam}`, {
        method: "DELETE",
      });
  
      const data = await response.json();
      console.log("📥 Delete response:", data);
  
      if (data.success) {
        await fetchRulesFromAPI();
        showNotification("Rule deleted successfully!", "success");
      } else throw new Error(data.error);
    } catch (error) {
      showNotification("Error deleting rule: " + error.message, "error");
    }
  }
  
  /** Fetch rules from backend API */
  async function fetchRulesFromAPI() {
    console.log("🔄 fetchRulesFromAPI() called");
    try {
      const response = await fetch(`${API_BASE}/api/rules`);
      console.log("📡 API Response status:", response.status);
  
      const data = await response.json();
      console.log("📦 API Response data:", data);
  
      if (data.success) {
        rules = data.data;
        console.log("✅ Rules loaded:", rules.length);
        loadRules();
      } else throw new Error(data.error || "Failed to fetch rules");
    } catch (error) {
      console.error("❌ Failed to fetch rules from API:", error);
      showNotification("Failed to load rules from server.", "error");
      loadRules();
    }
  }
  
  /** Display a notification message */
  function showNotification(message, type = "info") {
    console.log("📢 Notification:", message, type);
    const notification = document.createElement("div");
    notification.className = `alert alert-${
      type === "error" ? "danger" : type
    } alert-dismissible fade show`;
    notification.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
  
    document
      .querySelector(".card-body")
      .insertBefore(notification, document.querySelector(".table-responsive"));
  
    setTimeout(() => notification.remove(), 5000);
  }
  
  /* -------------------------------------------------------------------------- */
  /*                               Event Handlers                               */
  /* -------------------------------------------------------------------------- */
  
  document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ DOM Loaded - fetching rules...");
    fetchRulesFromAPI();
  });
  
  ruleForm.addEventListener("submit", (e) => {
    e.preventDefault();
    saveRule();
  });
  
  // Export functions globally (for inline onclick handlers)
  window.loadRules = loadRules;
  window.showAddRuleForm = showAddRuleForm;
  window.hideRuleForm = hideRuleForm;
  window.editRule = editRule;
  window.saveRule = saveRule;
  window.deleteRule = deleteRule;
  
  console.log("✅ All functions exported to window");
})();
