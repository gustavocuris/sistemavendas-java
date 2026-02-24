export default function TestScreen() {
  console.log("TEST SCREEN ✅", new Date().toISOString());
  return (
    <div style={{
      padding: 40,
      background: "yellow",
      color: "black",
      fontSize: 24,
      position: "fixed",
      inset: 0,
      zIndex: 999999
    }}>
      TESTE: BUILD/DEPLOY OK ✅
    </div>
  );
}
