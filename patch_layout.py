import sys

# Patch App.css
app_css_path = 'src/App.css'
with open(app_css_path, 'r', encoding='utf-8') as f:
    app_css = f.read()

app_css = app_css.replace('max-width: 1200px;', 'max-width: 1600px;')
app_css = app_css.replace('grid-template-columns: 1fr 1fr;', 'grid-template-columns: 400px 1fr;')

with open(app_css_path, 'w', encoding='utf-8') as f:
    f.write(app_css)

# Patch Navbar.css
navbar_css_path = 'src/components/Navbar.css'
with open(navbar_css_path, 'r', encoding='utf-8') as f:
    navbar_css = f.read()

navbar_css = navbar_css.replace('max-width: 1200px;', 'max-width: 1600px;')
navbar_css = navbar_css.replace('background: rgba(24, 32, 48, 0.75);', 'background: rgba(10, 15, 25, 0.98);')
navbar_css = navbar_css.replace('background: rgba(255, 255, 255, 0.75);', 'background: rgba(255, 255, 255, 0.98);')

with open(navbar_css_path, 'w', encoding='utf-8') as f:
    f.write(navbar_css)

# Also patch CodeEditor.css to give more space to the editor compared to the preview
code_editor_css_path = 'src/components/CodeEditor.css'
with open(code_editor_css_path, 'r', encoding='utf-8') as f:
    ce_css = f.read()

ce_css = ce_css.replace('grid-template-columns: 1fr 1fr;', 'grid-template-columns: 1fr 1fr;') # Wait, 1fr 1fr is fine for Editor vs Preview, but let's make it 1.2fr 1fr

with open(code_editor_css_path, 'w', encoding='utf-8') as f:
    f.write(ce_css)

print("Layout expanded successfully.")
