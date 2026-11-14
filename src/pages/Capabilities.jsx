import React from 'react';
import { Link } from 'react-router-dom';
import '@/components/lifeline/lifeline.css';

const capabilities = [
  ['Household plan, contacts and supply checklist', 'working', 'Real records in the database, readable only by the owning account and admins. Create, edit, reload and delete all exercised.', 'Yes, saved online. Readable offline only from the saved snapshot on the home screen.', 'Requires the app to load at least once.'],
  ['Saved snapshot on the home dashboard', 'working', 'A compressed copy of your plan, contacts, supply counts and community counts, stored in this browser at the last successful load.', 'Yes: it renders with no connection and is clearly labelled as a saved copy.', 'Browser storage on one device only. It is not encrypted by ARK.'],
  ['Printable emergency packet', 'working', 'Builds from your saved records and prints through the browser. Includes blanks for handwriting where data is missing.', 'Yes, on paper. Paper needs no power.', 'Printing or saving as PDF is a manual step you take.'],
  ['Guidance library', 'working', 'Ten sourced articles, searchable and filterable, marked draft pending professional review.', 'Partial: article text is bundled with the app and does not need a database call, but a cold load still needs the app itself.', 'Does not include treatment instructions, and no clinician has reviewed it yet.'],
  ['Community help board, announcements, incident register', 'working', 'Existing tables with live shared records; posts, claims and status updates save to the database.', 'No. These read and write over the network.', 'Not a monitored emergency channel. Not dispatch.'],
  ['Resource directory', 'working', 'Admin-created listings with source, last-checked date and an unverified default.', 'No.', 'No live availability, no feed. A listing is a claim, not a confirmation.'],
  ['Public relay messages and acknowledgments', 'partial', 'Signed public packets, a local queue, validated online gateway, server storage receipts and explicit device-signed reading acknowledgments. Not private messaging or verified identity.', 'Local queues work while the loaded page is available. The separate downloaded companion needs no server on compatible browsers.', 'Physical-phone outage testing is still pending. A receipt or acknowledgment never means help is coming.'],
  ['Manual public store-and-forward', 'partial', 'Copy, save, share and import bounded relay bundles. Device signatures are checked, duplicate packet IDs collapse locally, expired packets are not relayed.', 'Yes, with an available text or file-transfer method. Import into a signed-in gateway when internet returns.', 'All payloads are public and unencrypted. OS sharing paths vary; importing is explicit.'],
  ['Nearby browser connection', 'partial', 'Manually paired WebRTC data channels with no external signaling or relay server, plus peer-reported storage receipts.', 'Potentially on the same reachable Wi-Fi or hotspot. Both browsers must be open.', 'Experimental; router isolation, browser policy and sleep can prevent it. Not Bluetooth mesh or automatic discovery.'],
  ['Shareable offline relay tool', 'partial', 'A clean self-contained HTML companion that creates, stores and relays public packets without login. Participants can re-share clean copies.', 'On browsers that permit local HTML execution, device signing and local storage.', 'Not a universal phone installer. Many iPhone file previews cannot execute it. No physical-device validation yet.'],
  ['Native mesh and reliable background relay', 'not built', 'The browser core has a documented envelope protocol, but no native Bluetooth, Wi-Fi Direct, iOS Multipeer or radio adapter.', 'No automatic native mesh or dependable background transport.', 'Requires native iOS/Android engineering, hardware where applicable, permissions and device testing.'],
  ['Offline map packages', 'blocked', 'Not implemented. Needs licensed or packaged map data, which this build does not have.', 'No.', 'Requires a map data licence and native or packaged storage.'],
  ['Official emergency alerts', 'blocked', 'No alert source is connected. Nothing in this app is an official alert.', 'No.', 'Requires an authorised provider, credentials and a written agreement.'],
  ['Verified organisation identity', 'not built', 'Organisation accounts are not separated from ordinary accounts yet.', 'No.', 'Legal verification requires documents and a human review process.'],
  ['Tamper-evident audit trail', 'partial', 'Actions are recorded, but records are mutable and there is no independent hash verification.', 'No.', 'Needs append-only storage and external verification.'],
  ['Push notification to phones', 'blocked', 'Not configured. Push requires an installed native build with store credentials.', 'No.', 'Requires Apple and Google developer accounts and native store files.']
];

const labels = { working: 'WORKING', partial: 'PARTIAL', 'not built': 'NOT BUILT', blocked: 'BLOCKED' };

export default function Capabilities() {
  return <div className="ll-page">
    <span className="ll-eyebrow">Honest status</span>
    <h1 style={{ margin: '10px 0 8px' }}>What actually works</h1>
    <p className="ll-muted">Every row states what is built, whether it survives losing the internet, and what would have to be built elsewhere. If a row says blocked, no amount of configuration in this app will make it work.</p>

    <div className="ll-alert"><strong>How to check any claim yourself</strong>Open the feature and look at the data. Then disconnect the device and reload. If it does not appear, it is not offline. The printed packet is the only part of ARK that keeps working when everything else fails.</div>

    <table className="ll-status-table">
      <thead><tr><th>Feature</th><th>Status</th><th>What was built</th><th>Works without internet</th><th>Limit</th></tr></thead>
      <tbody>{capabilities.map(([name, status, built, offline, limit]) => <tr key={name}>
        <td><b>{name}</b></td>
        <td><span className={`ll-tag ${status === 'not built' ? 'not' : status}`}>{labels[status]}</span></td>
        <td>{built}</td>
        <td>{offline}</td>
        <td>{limit}</td>
      </tr>)}</tbody>
    </table>

    <section className="ll-card" style={{ marginTop: 24 }}>
      <h2>Not yet tested by a person on a phone</h2>
      <p>Saving and reloading records has been exercised against the live database. Airplane-mode behaviour on a physical phone has not been observed, so offline rows above stay conservative until you run that test: open the app, then turn on airplane mode, then reload.</p>
      <p className="ll-muted">Medical and emergency content has not been reviewed by a qualified professional. Treat every article as draft.</p>
    </section>

    <section className="ll-card" style={{ marginTop: 16 }}>
      <h2>What happens if ARK itself is down</h2>
      <p>The full ARK app depends on hosted database, login and other services. If those services are unreachable, its online features may be unavailable and a cold start of the full app is not guaranteed.</p>
      <p>Keeping code in a repository does not keep those services running. The separate downloaded relay tool is different: it has no online dependencies and can operate on a compatible browser with power and local storage. It is not a backup of your household records or the whole app.</p>
      <p><b>Design consequence:</b> prepare several fallbacks, but never rely on a single one. Download and check the <Link to="/Network" className="underline">offline relay tool</Link> before an outage. Keep a printed packet for when devices or power fail; reprint after every important change.</p>
    </section>
  </div>;
}