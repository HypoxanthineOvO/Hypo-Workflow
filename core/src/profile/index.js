export const PROFILE_DEFAULTS = Object.freeze({
  standard: {
    name: "standard",
    file_guard: "standard",
    auto_continue: true,
    auto_continue_mode: "safe",
    ask_interactions: true,
    subagents: true,
    permissions: "ask",
  },
  strict: {
    name: "strict",
    file_guard: "strict",
    auto_continue: false,
    auto_continue_mode: "ask",
    ask_interactions: true,
    subagents: true,
    permissions: "ask",
  },
  automation: {
    name: "automation",
    file_guard: "standard",
    auto_continue: true,
    auto_continue_mode: "aggressive",
    ask_interactions: false,
    subagents: true,
    permissions: "allow-safe",
  },
});

export const CLAUDE_CODE_PROFILE_DEFAULTS = Object.freeze({
  developer: {
    name: "developer",
    file_guard: "developer",
    auto_continue: true,
    auto_continue_mode: "aggressive",
    ask_interactions: false,
    subagents: true,
    permissions: "allow",
    destructive_actions: "allow",
  },
  standard: {
    name: "standard",
    file_guard: "standard",
    auto_continue: true,
    auto_continue_mode: "safe",
    ask_interactions: true,
    subagents: true,
    permissions: "ask",
    destructive_actions: "confirm",
  },
  strict: {
    name: "strict",
    file_guard: "strict",
    auto_continue: false,
    auto_continue_mode: "ask",
    ask_interactions: true,
    subagents: true,
    permissions: "ask",
    destructive_actions: "confirm",
  },
});

const CONFIRM_HIGH_RISK_GATES = Object.freeze({
  high_risk: "confirm",
  destructive_external: "confirm",
  plugin_install: "confirm",
  pr_remote_write: "confirm",
  user_level_config: "confirm",
  release_publish: "confirm",
});

export const CONFIGURATION_PROFILE_DEFAULTS = Object.freeze({
  "solo-auto": {
    key: "solo-auto",
    label: "个人全自动开发",
    description: "适合个人项目的高自动化配置：普通本地执行尽量自动推进，但 PR/MR 远端写、插件安装、用户级配置和发布仍需确认。",
    config: {
      automation: {
        level: "full",
        gates: {
          planning: "confirm",
          execution: "auto",
          destructive_external: "confirm",
          release_publish: "confirm",
        },
      },
      execution: {
        bash: {
          mode: "allow_local",
          confirm_external: false,
          confirm_destructive: false,
          confirm_system_install: false,
        },
        worker_separation: {
          mode: "recommended",
        },
      },
      evaluation: {
        auto_continue: true,
      },
      batch: {
        auto_chain: true,
        default_gate: "auto",
      },
    },
    cycle_gates: CONFIRM_HIGH_RISK_GATES,
  },
  "manual-review": {
    key: "manual-review",
    label: "手动检查",
    description: "适合新项目、敏感变更或学习流程：规划和关键阶段保留更多确认，普通执行不追求无打断。",
    config: {
      automation: {
        level: "manual",
        gates: {
          planning: "confirm",
          execution: "confirm",
          destructive_external: "confirm",
          release_publish: "confirm",
        },
      },
      plan: {
        mode: "interactive",
        interactive: {
          require_explicit_confirm: true,
        },
      },
      evaluation: {
        auto_continue: false,
      },
      batch: {
        auto_chain: false,
        default_gate: "confirm",
      },
      execution: {
        worker_separation: {
          mode: "recommended",
        },
      },
    },
    cycle_gates: CONFIRM_HIGH_RISK_GATES,
  },
  "team-strict": {
    key: "team-strict",
    label: "团队严格",
    description: "适合团队协作、受保护分支和 release 前流程：要求更强 worker separation、review strictness 和确认记录。",
    config: {
      automation: {
        level: "manual",
        gates: {
          planning: "confirm",
          execution: "confirm",
          destructive_external: "confirm",
          release_publish: "confirm",
        },
      },
      acceptance: {
        mode: "manual",
        require_user_confirm: true,
      },
      execution: {
        worker_separation: {
          mode: "strict",
        },
        step_overrides: {
          review_tests: {
            strict: true,
          },
          review_code: {
            strict: true,
          },
        },
      },
      evaluation: {
        auto_continue: false,
      },
      batch: {
        auto_chain: false,
        default_gate: "confirm",
      },
    },
    cycle_gates: CONFIRM_HIGH_RISK_GATES,
  },
  "analysis-hybrid": {
    key: "analysis-hybrid",
    label: "分析混合",
    description: "适合先调查后修改的问题：允许证据收集和只读分析，代码变更前确认。",
    config: {
      default_workflow_kind: "analysis",
      automation: {
        level: "balanced",
        gates: {
          planning: "confirm",
          execution: "auto",
          destructive_external: "confirm",
          release_publish: "confirm",
        },
      },
      execution: {
        steps: {
          preset: "analysis",
        },
        analysis: {
          interaction_mode: "hybrid",
          boundaries: {
            code_changes: {
              manual: "deny",
              hybrid: "confirm",
              auto: "allow",
            },
            restart_services: "confirm",
            install_system_dependencies: "ask",
            network_remote_resources: {
              manual: "ask",
              hybrid: "ask",
              auto: "allow",
            },
            destructive_or_external_side_effects: "ask",
          },
        },
        worker_separation: {
          mode: "recommended",
        },
      },
      evaluation: {
        auto_continue: true,
      },
    },
    cycle_gates: CONFIRM_HIGH_RISK_GATES,
  },
});

export function normalizeProfile(input = {}) {
  const requested = typeof input === "string" ? input : input.name || input.profile || "standard";
  const base = PROFILE_DEFAULTS[requested] || PROFILE_DEFAULTS.standard;
  const overrides = typeof input === "object" && input ? input : {};
  return {
    ...base,
    ...overrides,
    name: base.name,
  };
}

export function selectProfile(config = {}) {
  const opencode = config?.opencode || {};
  const profile = normalizeProfile(opencode.profile || config?.profile || "standard");
  return {
    ...profile,
    auto_continue: opencode.auto_continue ?? profile.auto_continue,
    compaction: opencode.compaction || profile.compaction,
    agents: opencode.agents || profile.agents,
    providers: opencode.providers || profile.providers,
  };
}

export function normalizeClaudeCodeProfile(input = {}) {
  const requested = typeof input === "string" ? input : input.name || input.profile || "standard";
  const base = CLAUDE_CODE_PROFILE_DEFAULTS[requested] || CLAUDE_CODE_PROFILE_DEFAULTS.standard;
  const overrides = typeof input === "object" && input ? input : {};
  return {
    ...base,
    ...overrides,
    name: base.name,
  };
}

export function selectClaudeCodeProfile(config = {}) {
  const claudeCode = config?.claude_code || {};
  const profile = normalizeClaudeCodeProfile(claudeCode.profile || config?.profile || "standard");
  return {
    ...profile,
    agents: claudeCode.agents || profile.agents,
    hooks: claudeCode.hooks || profile.hooks,
    settings: claudeCode.settings || profile.settings,
    status: claudeCode.status || profile.status,
  };
}

export function listConfigurationProfiles() {
  return Object.values(CONFIGURATION_PROFILE_DEFAULTS).map((profile) => withYaml(profile));
}

export function configurationProfile(key) {
  const profile = CONFIGURATION_PROFILE_DEFAULTS[key];
  if (!profile) throw new Error(`Unknown configuration profile: ${key}`);
  return withYaml(profile);
}

function withYaml(profile) {
  return {
    ...profile,
    config: clone(profile.config),
    cycle_gates: { ...profile.cycle_gates },
    yaml: renderProfileYaml(profile),
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function renderProfileYaml(profile) {
  return [
    `# ${profile.key} - ${profile.label}`,
    renderYamlObject(profile.config).trimEnd(),
    "cycle:",
    "  lifecycle_policy:",
    "    gates:",
    ...Object.entries(profile.cycle_gates).map(([key, value]) => `      ${key}: ${value}`),
    "",
  ].join("\n");
}

function renderYamlObject(value, indent = 0) {
  const spaces = " ".repeat(indent);
  const lines = [];
  for (const [key, item] of Object.entries(value || {})) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      lines.push(`${spaces}${key}:`);
      lines.push(renderYamlObject(item, indent + 2).trimEnd());
    } else if (Array.isArray(item)) {
      lines.push(`${spaces}${key}:`);
      for (const entry of item) lines.push(`${spaces}  - ${entry}`);
    } else {
      lines.push(`${spaces}${key}: ${item}`);
    }
  }
  return `${lines.join("\n")}\n`;
}
