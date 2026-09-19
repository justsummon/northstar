import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,CalendarCheck,Check,Compass,GraduationCap,Route,Sparkles,Target} from 'lucide-react';
import './Landing.css';

const steps=[
  {
    number:'01',
    icon:Target,
    title:'Собери профиль',
    text:'Оценки, экзамены, бюджет, интересы и Major / Spike складываются в одну понятную картину.',
    tone:'coral',
  },
  {
    number:'02',
    icon:GraduationCap,
    title:'Найди свой fit',
    text:'Получишь подходящие вузы с объяснением требований, бюджета и сильных сторон профиля.',
    tone:'lilac',
  },
  {
    number:'03',
    icon:Route,
    title:'Следуй маршруту',
    text:'Roadmap превращает поступление в задачи по датам и показывает один ближайший шаг.',
    tone:'mint',
  },
];

export default function Landing(){
  return <div className="landing">
    <div className="landing-glow landing-glow-one" aria-hidden="true"/>
    <div className="landing-glow landing-glow-two" aria-hidden="true"/>

    <header className="landing-header">
      <Link to="/" className="landing-brand" aria-label="Northstar — главная">
        <span className="landing-brand-star" aria-hidden="true">✦</span>
        <span>northstar</span>
      </Link>
      <nav className="landing-nav" aria-label="Навигация по лендингу">
        <a href="#how">Как это работает</a>
        <a href="#result">Что ты получишь</a>
        <a href="#roadmap-preview">Roadmap</a>
      </nav>
      <Link className="landing-login" to="/login">Войти <ArrowRight size={16}/></Link>
    </header>

    <main>
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow">
            <span aria-hidden="true">✦</span>
            Казахстан → зарубежный университет
          </div>
          <h1 id="landing-title">Большие мечты.<br/><em>Ясный маршрут.</em></h1>
          <p className="landing-lead">Northstar превращает хаос требований, экзаменов и дедлайнов в персональный путь поступления — от твоего профиля до следующего действия.</p>
          <div className="landing-actions">
            <Link className="landing-primary" to="/login">Построить маршрут <ArrowRight size={18}/></Link>
            <a className="landing-secondary" href="#how">Посмотреть, как это работает</a>
          </div>
          <div className="landing-proof" aria-label="Результат работы сервиса">
            <div><strong>3–5</strong><span>подходящих вузов</span></div>
            <div><strong>90 дней</strong><span>в персональном плане</span></div>
            <div><strong>1 шаг</strong><span>который нужен сейчас</span></div>
          </div>
        </div>

        <div className="landing-visual" aria-label="Карта маршрута из Казахстана к университетам Великобритании и Нидерландов">
          <div className="landing-orbit orbit-one" aria-hidden="true"/>
          <div className="landing-orbit orbit-two" aria-hidden="true"/>
          <div className="landing-map-shell">
            <img src="/assets/northstar-route-map.webp" alt="Северная звезда над картой маршрута из Казахстана в Великобританию и Нидерланды"/>
            <div className="landing-fit-card">
              <span className="landing-mini-icon"><Sparkles size={16}/></span>
              <div><small>Лучшее совпадение</small><strong>Fit 87%</strong></div>
            </div>
            <div className="landing-next-card">
              <span className="landing-mini-icon amber"><CalendarCheck size={16}/></span>
              <div><small>Твой следующий шаг</small><strong>Составить IELTS-план</strong></div>
              <span className="landing-next-arrow">→</span>
            </div>
            <div className="landing-route-chip"><Compass size={15}/> CS · UK + Netherlands</div>
          </div>
        </div>
      </section>

      <div className="landing-trust">
        <span><Check size={15}/> Объяснение каждой рекомендации</span>
        <span><Check size={15}/> Оценка без гарантий поступления</span>
        <span><Check size={15}/> Прогресс сохраняется</span>
      </div>

      <section className="landing-how" id="how" aria-labelledby="how-title">
        <div className="landing-section-heading">
          <span className="landing-kicker">Три понятных шага</span>
          <h2 id="how-title">От твоей точки<br/>до цели на карте.</h2>
          <p>Вместо сотни вкладок — связный сценарий, в котором каждый экран отвечает на один важный вопрос.</p>
        </div>
        <div className="landing-steps">
          {steps.map(({number,icon:Icon,title,text,tone})=><article className={'landing-step '+tone} key={number}>
            <div className="landing-step-top"><span>{number}</span><Icon size={25}/></div>
            <h3>{title}</h3>
            <p>{text}</p>
            <span className="landing-step-arrow" aria-hidden="true">↗</span>
          </article>)}
        </div>
      </section>

      <section className="landing-result" id="result">
        <div className="landing-result-copy">
          <span className="landing-kicker light">Не просто список вузов</span>
          <h2>Понимай, почему вариант подходит именно тебе.</h2>
          <p>Northstar сопоставляет твои баллы, бюджет, страны и направление с требованиями программ. Результат — объяснимый shortlist и честные пробелы, над которыми можно работать.</p>
          <ul>
            <li><Check size={16}/> требования и твои результаты рядом</li>
            <li><Check size={16}/> стоимость и финансовая помощь</li>
            <li><Check size={16}/> ориентировочная, а не обещанная оценка</li>
          </ul>
          <Link className="landing-light-button" to="/login">Заполнить профиль <ArrowRight size={18}/></Link>
        </div>
        <div className="landing-result-card">
          <div className="landing-card-head">
            <div><small>Твоё совпадение</small><strong>University of Amsterdam</strong></div>
            <span>87%</span>
          </div>
          <div className="landing-score-track"><i/></div>
          <div className="landing-reasons">
            <div><Check size={15}/><span><b>IELTS</b> — твой балл соответствует требованию</span></div>
            <div><Check size={15}/><span><b>Бюджет</b> — программа помещается в диапазон</span></div>
            <div><Check size={15}/><span><b>Major</b> — сильное совпадение с Computer Science</span></div>
          </div>
          <div className="landing-data-note">Ориентировочная оценка · требования отмечены источниками</div>
        </div>
      </section>

      <section className="landing-roadmap" id="roadmap-preview">
        <div className="landing-roadmap-heading">
          <span className="landing-kicker">Маршрут вместо тревоги</span>
          <h2>Один ближайший шаг.<br/>Весь путь — в поле зрения.</h2>
        </div>
        <div className="landing-timeline">
          <article className="done">
            <span className="landing-timeline-dot"><Check size={14}/></span>
            <small>Сегодня</small>
            <h3>Профиль собран</h3>
            <p>Сильные стороны и ограничения уже учтены.</p>
          </article>
          <article className="current">
            <span className="landing-timeline-dot"><Sparkles size={14}/></span>
            <small>Следующие 7 дней</small>
            <h3>Пробный IELTS</h3>
            <p>Зафиксируй текущий уровень и цель по секциям.</p>
          </article>
          <article>
            <span className="landing-timeline-dot"/>
            <small>Октябрь</small>
            <h3>Shortlist и эссе</h3>
            <p>Сравни требования и собери первую историю.</p>
          </article>
          <article>
            <span className="landing-timeline-dot"/>
            <small>Декабрь</small>
            <h3>Подача заявок</h3>
            <p>Финальная проверка документов и дедлайнов.</p>
          </article>
        </div>
      </section>
    </main>

    <footer className="landing-footer">
      <Link to="/" className="landing-brand"><span className="landing-brand-star" aria-hidden="true">✦</span><span>northstar</span></Link>
      <p>Маршрут вместо хаоса вкладок.</p>
      <Link to="/login">Начать свой путь →</Link>
    </footer>
  </div>;
}

