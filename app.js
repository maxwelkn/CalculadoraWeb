(function () {
  'use strict';

  var expressionElement = document.getElementById('expression');
  var resultElement = document.getElementById('result');
  var messageElement = document.getElementById('message');
  var keypad = document.querySelector('.keypad');
  var historyList = document.getElementById('history-list');
  var historyEmpty = document.getElementById('history-empty');
  var historyCount = document.getElementById('history-count');
  var clearHistoryButton = document.getElementById('clear-history');
  var storageKey = 'calculadora-web-historial-v1';
  var history = loadHistory();
  var currentInput = '0';
  var firstOperand = null;
  var operator = null;
  var waitingForOperand = false;
  var justCalculated = false;
  var expressionText = '';

  function symbolFor(value) {
    return value === '*' ? '×' : value === '/' ? '÷' : value === '-' ? '−' : '+';
  }

  function showMessage(text, isError) {
    messageElement.textContent = text;
    messageElement.className = isError ? 'message error' : 'message';
  }

  function loadHistory() {
    var saved;
    var parsed;
    try {
      saved = window.localStorage.getItem(storageKey);
      parsed = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (item) {
        return item && typeof item.expression === 'string' && typeof item.result === 'string';
      });
    } catch (error) {
      return [];
    }
  }

  function saveHistory() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(history));
      return true;
    } catch (error) {
      showMessage('El navegador no permitió guardar el historial.', true);
      return false;
    }
  }

  function renderHistory() {
    var item;
    var row;
    var textBox;
    var expression;
    var answer;
    var deleteButton;
    var index;
    historyList.textContent = '';
    historyCount.textContent = String(history.length);
    historyEmpty.style.display = history.length ? 'none' : 'flex';
    clearHistoryButton.disabled = history.length === 0;
    for (index = 0; index < history.length; index += 1) {
      item = history[index];
      row = document.createElement('li');
      row.className = 'history-item';
      textBox = document.createElement('div');
      textBox.className = 'history-text';
      expression = document.createElement('span');
      expression.className = 'history-expression';
      expression.textContent = item.expression;
      answer = document.createElement('strong');
      answer.className = 'history-result';
      answer.textContent = item.result;
      deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'delete-item';
      deleteButton.setAttribute('data-index', String(index));
      deleteButton.setAttribute('aria-label', 'Eliminar operación ' + item.expression);
      deleteButton.textContent = '×';
      deleteButton.addEventListener('click', deleteHistoryItem);
      textBox.appendChild(expression);
      textBox.appendChild(answer);
      row.appendChild(textBox);
      row.appendChild(deleteButton);
      historyList.appendChild(row);
    }
  }

  function addHistory(expression, result) {
    history.unshift({ expression: expression, result: result });
    renderHistory();
    saveHistory();
  }

  function deleteHistoryItem(event) {
    var index = Number(event.currentTarget.getAttribute('data-index'));
    if (isNaN(index) || index < 0 || index >= history.length) return;
    history.splice(index, 1);
    renderHistory();
    if (saveHistory()) showMessage('Operación eliminada.', false);
  }

  function render() {
    resultElement.textContent = currentInput;
    expressionElement.textContent = expressionText || '\u00a0';
  }

  function reset() {
    currentInput = '0';
    firstOperand = null;
    operator = null;
    waitingForOperand = false;
    justCalculated = false;
    expressionText = '';
    showMessage('También puedes usar tu teclado.', false);
    render();
  }

  function enterDigit(digit) {
    if (justCalculated) {
      firstOperand = null;
      operator = null;
      expressionText = '';
      justCalculated = false;
    }
    if (waitingForOperand) {
      currentInput = digit;
      waitingForOperand = false;
    } else if (currentInput === '0') {
      currentInput = digit;
    } else if (currentInput.replace(/\D/g, '').length < 15) {
      currentInput += digit;
    }
    showMessage('También puedes usar tu teclado.', false);
    render();
  }

  function enterDecimal() {
    if (justCalculated) {
      firstOperand = null;
      operator = null;
      expressionText = '';
      justCalculated = false;
    }
    if (waitingForOperand) {
      currentInput = '0.';
      waitingForOperand = false;
    } else if (currentInput.indexOf('.') === -1) {
      currentInput += '.';
    }
    showMessage('También puedes usar tu teclado.', false);
    render();
  }

  function calculate(left, right, selectedOperator) {
    var result;
    if (selectedOperator === '+') result = left + right;
    if (selectedOperator === '-') result = left - right;
    if (selectedOperator === '*') result = left * right;
    if (selectedOperator === '/') {
      if (right === 0) return null;
      result = left / right;
    }
    if (!isFinite(result)) return null;
    return String(Number(result.toPrecision(12)));
  }

  function selectOperator(nextOperator) {
    var intermediate;
    if (operator && !waitingForOperand) {
      intermediate = calculate(firstOperand, Number(currentInput), operator);
      if (intermediate === null) {
        showMessage('No se puede dividir entre cero.', true);
        return;
      }
      currentInput = intermediate;
    }
    firstOperand = Number(currentInput);
    operator = nextOperator;
    waitingForOperand = true;
    justCalculated = false;
    expressionText = currentInput + ' ' + symbolFor(operator);
    showMessage('También puedes usar tu teclado.', false);
    render();
  }

  function finishCalculation() {
    var secondOperand;
    var operation;
    var answer;
    if (!operator || waitingForOperand) return;
    secondOperand = Number(currentInput);
    operation = String(firstOperand) + ' ' + symbolFor(operator) + ' ' + currentInput;
    answer = calculate(firstOperand, secondOperand, operator);
    if (answer === null) {
      showMessage('No se puede dividir entre cero.', true);
      return;
    }
    currentInput = answer;
    firstOperand = null;
    operator = null;
    waitingForOperand = false;
    justCalculated = true;
    expressionText = operation + ' =';
    showMessage('Cálculo realizado.', false);
    render();
    addHistory(operation, answer);
  }

  function backspace() {
    if (justCalculated) {
      reset();
      return;
    }
    if (waitingForOperand) return;
    currentInput = currentInput.length > 1 ? currentInput.slice(0, -1) : '0';
    if (currentInput === '-') currentInput = '0';
    render();
  }

  function runAction(action, value) {
    if (action === 'digit') enterDigit(value);
    if (action === 'decimal') enterDecimal();
    if (action === 'operator') selectOperator(value);
    if (action === 'equals') finishCalculation();
    if (action === 'clear') reset();
    if (action === 'backspace') backspace();
  }

  keypad.addEventListener('click', function (event) {
    var button = event.target;
    while (button && button !== keypad && button.tagName !== 'BUTTON') button = button.parentNode;
    if (button && keypad.contains(button)) runAction(button.getAttribute('data-action'), button.getAttribute('data-value'));
  });

  clearHistoryButton.addEventListener('click', function () {
    history = [];
    renderHistory();
    if (saveHistory()) showMessage('Historial eliminado.', false);
  });

  document.addEventListener('keydown', function (event) {
    var key = event.key;
    if (key === 'Enter' && event.target.tagName === 'BUTTON') return;
    if (/^[0-9]$/.test(key)) runAction('digit', key);
    else if (key === '.' || key === ',') runAction('decimal');
    else if (key === '+' || key === '-' || key === '*' || key === '/') runAction('operator', key);
    else if (key === 'Enter' || key === '=') { event.preventDefault(); runAction('equals'); }
    else if (key === 'Backspace') runAction('backspace');
    else if (key === 'Escape') runAction('clear');
  });

  render();
  renderHistory();
}());
