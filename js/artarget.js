class ARTarget {
  constructor(options = {}) {
    this.options = options;

    // DOM-элементы UI панели вопроса
    this.questionPanel = options.questionPanel || document.getElementById('questionPanel') || null;
    this.questionImg = options.questionImg || (this.questionPanel ? this.questionPanel.querySelector('.question-img') : null);
    this.questionText = options.questionText || (this.questionPanel ? this.questionPanel.querySelector('.question-text') : null);
    this.questionBody = options.questionBody || (this.questionPanel ? this.questionPanel.querySelector('.question-body') : null);

    this._onQuestionSubmit = null;
  }

  /**
   * Отображение вопроса в панели
   * @param {Object} data - Данные вопроса { question, imageSrc, answers, ... }
   * @param {Function} onSubmit - Коллбэк при ответе
   */
  showQuestion(data, onSubmit) {
    if (!this.questionPanel) return;
    this._onQuestionSubmit = onSubmit || null;

    if (this.questionImg) {
      if (data && data.imageSrc) {
        this.questionImg.src = data.imageSrc;
        this.questionImg.style.display = 'block';
      } else {
        this.questionImg.style.display = 'none';
      }
    }

    if (this.questionText) {
      this.questionText.textContent = (data && data.question) ? data.question : '';
    }

    this._renderQuestionBody(data);
    this.questionPanel.classList.add('open');
  }

  /**
   * Очистка и отрисовка содержимого/кнопок ответов
   * @param {Object} data 
   * @private
   */
  _renderQuestionBody(data) {
    if (!this.questionBody) return;

    // Очищаем старые кнопки/элементы, чтобы не плодить дубликаты и пустые блоки
    this.questionBody.innerHTML = '';

    if (!data || !data.answers || !Array.isArray(data.answers)) {
      return;
    }

    data.answers.forEach((answer, index) => {
      const btn = document.createElement('button');
      btn.className = 'question-option-btn';
      btn.textContent = typeof answer === 'object' ? (answer.text || '') : answer;

      btn.addEventListener('click', () => {
        if (typeof this._onQuestionSubmit === 'function') {
          this._onQuestionSubmit(answer, index);
        }
        this.hideQuestion();
      });

      this.questionBody.appendChild(btn);
    });
  }

  /**
   * Скрытие панели вопроса
   */
  hideQuestion() {
    if (this.questionPanel) {
      this.questionPanel.classList.remove('open');
    }
    this._onQuestionSubmit = null;
  }
}