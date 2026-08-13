import type { DataError } from '@/lib/loader';

const ERROR_TITLES: Record<DataError['kind'], string> = {
  missing: '데이터 파일을 찾을 수 없습니다',
  parse: '데이터 파일을 읽을 수 없습니다',
  schema: '데이터 형식이 올바르지 않습니다',
};

export function DataErrorScreen({ error }: { error: DataError }) {
  return (
    <main className="data-error-page">
      <section className="data-error-panel" role="alert" aria-labelledby="data-error-title">
        <p className="data-error-label">데이터 오류</p>
        <h1 id="data-error-title" className="data-error-title">
          {ERROR_TITLES[error.kind]}
        </h1>
        <p className="data-error-message">{error.message}</p>

        <dl className="data-error-file">
          <dt>문제가 된 파일</dt>
          <dd>data/{error.file}</dd>
        </dl>

        {error.details.length > 0 && (
          <div className="data-error-details">
            <h2>확인할 내용</h2>
            <ul>
              {error.details.map((detail, index) => (
                <li key={`${index}-${detail}`}>{detail}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="data-error-help">파일을 복구하거나 내용을 고친 뒤 페이지를 새로고침해 주세요.</p>
      </section>
    </main>
  );
}
