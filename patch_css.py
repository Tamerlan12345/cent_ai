import sys

css_to_add = """
/* Enhanced Action Buttons Wrapper */
.action-buttons-wrapper {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  width: 100%;
}

.btn-large {
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: linear-gradient(135deg, var(--accent-primary), #00d2ff);
  border: none;
  color: #000;
  box-shadow: 0 4px 15px rgba(0, 242, 254, 0.2);
  transition: all 0.3s ease;
}

.btn-large:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(0, 242, 254, 0.3);
  transform: translateY(-2px);
}

.btn-outline {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--accent-primary);
  padding: 0.6rem 1.25rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.btn-outline:hover:not(:disabled) {
  background: rgba(0, 242, 254, 0.1);
}

.pulse-text {
  animation: pulseOpacity 1.5s infinite;
}

@keyframes pulseOpacity {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}
"""

with open('src/components/CodeEditor.css', 'a', encoding='utf-8') as f:
    f.write(css_to_add)

print("CSS appended successfully")
