import sys

scrollbar_css = """
      /* Custom Scrollbar for Iframe */
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: #0A0E17; }
      ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
"""

# Patch consoleBridge.ts
bridge_path = 'src/lib/consoleBridge.ts'
with open(bridge_path, 'r', encoding='utf-8') as f:
    bridge_content = f.read()

bridge_content = bridge_content.replace(
    'body { margin: 0; padding: 1rem; background: #0A0E17; color: #E2E8F0; font-family: system-ui, sans-serif; }',
    'body { margin: 0; padding: 1rem; background: #0A0E17; color: #E2E8F0; font-family: system-ui, sans-serif; }\n' + scrollbar_css
)

with open(bridge_path, 'w', encoding='utf-8') as f:
    f.write(bridge_content)


# Patch CodeEditor.tsx
editor_path = 'src/components/CodeEditor.tsx'
with open(editor_path, 'r', encoding='utf-8') as f:
    editor_content = f.read()

editor_content = editor_content.replace(
    'body { margin: 0; padding: 1rem; background: #0A0E17; color: #E2E8F0; font-family: system-ui, sans-serif; }',
    'body { margin: 0; padding: 1rem; background: #0A0E17; color: #E2E8F0; font-family: system-ui, sans-serif; }\n' + scrollbar_css
)

with open(editor_path, 'w', encoding='utf-8') as f:
    f.write(editor_content)

print("Scrollbar injected successfully.")
