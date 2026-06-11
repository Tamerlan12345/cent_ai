import sys

content = open('src/components/CodeEditor.tsx', 'r', encoding='utf-8').read()

old_code = """        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {mission && (
            <button
              onClick={handleRunMissionChecks}
              disabled={checkingMission}
              className="btn btn-secondary"
              title="Запустить автопроверки текущей миссии"
            >
              <CheckCircle2 size={16} /> {checkingMission ? 'Проверяю...' : 'Проверить миссию'}
            </button>
          )}
          <button onClick={handleInternalDeploy} className="btn btn-secondary" title="Сохранить и открыть /preview/:id">
            <Rocket size={16} /> Опубликовать в песочнице
          </button>
          <button onClick={handleSendHomework} disabled={loadingReview} className="btn btn-primary">
            {loadingReview ? (
              <span>Запрос к ИИ…</span>
            ) : (
              <>
                <Send size={16} /> Проверить ДЗ
              </>
            )}
          </button>
        </div>"""

new_code = """        <div className="action-buttons-wrapper">
          {mission && (
            <button
              onClick={handleRunMissionChecks}
              disabled={checkingMission}
              className="btn btn-outline"
              title="Запустить автопроверки текущей миссии"
            >
              <CheckCircle2 size={16} /> {checkingMission ? 'Проверяю...' : 'Проверить миссию'}
            </button>
          )}
          <button onClick={handleInternalDeploy} className="btn btn-secondary" title="Сохранить и открыть /preview/:id">
            <Rocket size={16} /> Внутренний деплой
          </button>
          <button onClick={handleSendHomework} disabled={loadingReview} className="btn btn-primary btn-large">
            {loadingReview ? (
              <span className="pulse-text">Запрос к ИИ…</span>
            ) : (
              <>
                <Send size={16} /> Отправить на проверку
              </>
            )}
          </button>
        </div>"""

if old_code in content:
    content = content.replace(old_code, new_code)
    open('src/components/CodeEditor.tsx', 'w', encoding='utf-8').write(content)
    print('Updated CodeEditor.tsx')
else:
    print('Failed to find old code in CodeEditor.tsx')
