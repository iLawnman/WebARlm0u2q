// arbutton.js - AR Button Creator
import { playSound } from './audio.js';

export class ARButtonCreator {
  constructor() {}

  buildQuestionBody(bodyEl, data, onAnswer, ui, arInput, designPrefab) {
    bodyEl.innerHTML = '';
    const type = data.answerType || 'Slide';
    const options = data.options || [];

    if (type === 'Button') {
      this._buildButtonGrid(bodyEl, options, onAnswer, arInput);
    } else if (type === 'InputField') {
      this._buildInputField(bodyEl, data, onAnswer, arInput, designPrefab);
    } else if (type === 'Art' || type === 'AntiArt') {
      this._buildArtButton(bodyEl, onAnswer, arInput);
    } else {
      this._buildSlider(bodyEl, data, options, onAnswer, arInput);
    }
  }

  _buildButtonGrid(bodyEl, options, onAnswer, arInput) {
    const grid = document.createElement('div');
    grid.className = 'ar-quest-options-grid';
    
    options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ar-quest-btn';
      btn.textContent = opt.text || `Вариант ${idx + 1}`;
      
      if (arInput) {
        arInput.bindInteractiveEvent(btn, `OptionButton_${idx + 1}`, () => onAnswer(idx + 1));
      }
      
      grid.appendChild(btn);
    });
    
    bodyEl.appendChild(grid);
  }

  _buildInputField(bodyEl, data, onAnswer, arInput, designPrefab) {
    const wrap = document.createElement('div');
    wrap.className = 'ar-quest-input-block';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ar-quest-input';
    input.placeholder = (designPrefab && designPrefab.input_ph_text) || 'Введите ответ...';
    
    if (arInput) arInput.bindInputField(input);

    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        playSound('click');
        onAnswer(input.value);
      }
    });

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'ar-quest-submit-btn';
    submitBtn.textContent = 'OK';
    
    if (arInput) {
      arInput.bindInteractiveEvent(submitBtn, 'InputSubmitButton', () => onAnswer(input.value));
    }

    wrap.appendChild(input);
    wrap.appendChild(submitBtn);
    bodyEl.appendChild(wrap);
  }

  _buildArtButton(bodyEl, onAnswer, arInput) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ar-quest-submit-btn ar-quest-ok-btn';
    btn.textContent = 'OK';
    
    if (arInput) {
      arInput.bindInteractiveEvent(btn, 'ArtOKButton', () => onAnswer(true));
    }
    
    bodyEl.appendChild(btn);
  }

  _buildSlider(bodyEl, data, options, onAnswer, arInput) {
    let idx = 0;
    const total = Math.max(options.length, 1);

    const slider = document.createElement('div');
    slider.className = 'ar-quest-slider';

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'ar-slide-nav prev';
    prev.textContent = '◄';

    const slideContent = document.createElement('div');
    slideContent.className = 'ar-slide-content';
    slideContent.textContent = options[0]?.text || data.mainText || data.question || '';

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'ar-slide-nav next';
    next.textContent = '►';

    const update = () => {
      slideContent.textContent = options[idx]?.text || data.mainText || data.question || '';
    };

    if (arInput) {
      arInput.bindInteractiveEvent(prev, 'SliderPrev', () => {
        idx = (idx - 1 + total) % total;
        update();
      });
      
      arInput.bindInteractiveEvent(next, 'SliderNext', () => {
        idx = (idx + 1) % total;
        update();
      });
    }

    slider.appendChild(prev);
    slider.appendChild(slideContent);
    slider.appendChild(next);
    bodyEl.appendChild(slider);

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'ar-quest-submit-btn ar-quest-ok-btn';
    okBtn.textContent = 'OK';
    
    if (arInput) {
      arInput.bindInteractiveEvent(okBtn, 'SliderOK', () => onAnswer(idx + 1));
    }
    
    bodyEl.appendChild(okBtn);
  }
}