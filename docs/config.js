/* ==========================================================================
   明戸杯 トーナメント表 — 接続設定
   ここだけ書き換えれば動きます。
   ========================================================================== */
window.MEIDO_CONFIG = {

  /**
   * 【推奨】静的スナップショットの置き場所。
   *   GAS の「トーナメント表を今すぐ公開」で bracket.json / rev.json が
   *   ここに push される（GitHub Pages, jsDelivr, 自前サーバなど）。
   *   末尾スラッシュあり。CDN配信なので何人が見に来ても無料・無制限。
   *
   *   例) 'https://<ユーザ名>.github.io/<リポジトリ>/data/'
   *       'https://cdn.jsdelivr.net/gh/<ユーザ名>/<リポジトリ>@main/data/'
   */
  staticBase: 'https://ginka1108.github.io/meidoena-tournament/data/',

  /**
   * 【フォールバック】GAS ウェブアプリの /exec URL。
   *   staticBase が空のときはこちらを直接読む。
   *   ※GASは1日あたりのスクリプト実行時間に上限があるので、
   *     配信PCなど少数の端末から見る場合だけにすること（docs/03を参照）。
   */
  gasUrl: 'https://script.google.com/macros/s/AKfycbxekIU63c5_QhEPWAsJ5dfew7yqjTCfY5lUGUabTqD2DsLHCcgUNuY0bU77poCHyXmsgQ/exec',

  /** 参照APIにトークンをかけた場合のみ設定 */
  apiToken: '',

  /**
   * どちらの経路でデータを取るか。
   *   'auto'   … staticBase があればそちら、無ければ gasUrl（既定）
   *   'static' … 常に staticBase（GitHub Pages など）
   *   'gas'    … 常に gasUrl（GASを直接読む）
   *
   * URLで一時的に上書きできます。config.js を書き換える必要はありません。
   *   …/index.html?source=gas&poll=3000   ← 抽選中。反映が速い代わりにGASの実行時間を食う
   *   …/index.html?source=static          ← 通常。何人が見ても無料
   */
  source: 'auto',

  /**
   * rev.json を見に行く間隔(ms)。
   * rev.json は数十バイトなので、静的配信なら5〜10秒でも負荷になりません。
   */
  pollRevMs: 8000,

  /**
   * GASを直接読むときの間隔(ms)。
   * 1端末×8時間で、3秒なら約48分ぶんのスクリプト実行時間を使います
   * （無料アカウントの上限は90分/日）。**配信PCなど少数の端末専用**にしてください。
   */
  gasPollMs: 3000,

  /**
   * 更新を取り込んだときに「更新がありました」のトーストを出すか。
   * 配信に映る場合は false のままにしてください（右上のランプとリビジョン表示で足ります）。
   */
  showUpdateToast: false,

  /** GAS直で CORS に弾かれたとき JSONP に自動フォールバックする */
  allowJsonp: true,

  /** 起動時の表示。'overview' | 'block' | 'round' */
  defaultView: 'overview',

  /** PNG書き出しの倍率 */
  exportScale: 2,
};
