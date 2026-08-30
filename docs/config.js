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
  gasUrl: '',

  /** 参照APIにトークンをかけた場合のみ設定 */
  apiToken: '',

  /** rev.json を見に行く間隔(ms)。静的配信なら5秒でも余裕。GAS直なら30秒以上。 */
  pollRevMs: 15000,

  /** GAS直で CORS に弾かれたとき JSONP に自動フォールバックする */
  allowJsonp: true,

  /** 起動時の表示。'overview' | 'block' | 'round' */
  defaultView: 'overview',

  /** PNG書き出しの倍率 */
  exportScale: 2,
};
