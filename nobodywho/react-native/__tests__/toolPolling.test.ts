import { _runToolPollingLoop as runToolPollingLoop } from "../src/tool";

describe("runToolPollingLoop", () => {
  test("resolves successful pending calls", async () => {
    const resolvePendingCall = jest.fn();
    const nextPendingCall = jest
      .fn()
      .mockResolvedValueOnce({
        callId: "1",
        argumentsJson: JSON.stringify({ text: "hello" }),
      })
      .mockResolvedValueOnce(null);

    const inner = { nextPendingCall, resolvePendingCall } as any;
    const parseArgs = (argumentsJson: string) => [JSON.parse(argumentsJson).text];
    const callTool = jest.fn(async (text: string) => `ok:${text}`);

    await runToolPollingLoop(inner, parseArgs, callTool);

    expect(callTool).toHaveBeenCalledWith("hello");
    expect(resolvePendingCall).toHaveBeenCalledWith("1", "ok:hello");
  });

  test("resolves tool errors back to rust", async () => {
    const resolvePendingCall = jest.fn();
    const nextPendingCall = jest
      .fn()
      .mockResolvedValueOnce({
        callId: "2",
        argumentsJson: JSON.stringify({ text: "hello" }),
      })
      .mockResolvedValueOnce(null);

    const inner = { nextPendingCall, resolvePendingCall } as any;
    const parseArgs = (argumentsJson: string) => [JSON.parse(argumentsJson).text];
    const callTool = jest.fn(async () => {
      throw new Error("boom");
    });

    await runToolPollingLoop(inner, parseArgs, callTool);

    expect(resolvePendingCall).toHaveBeenCalledWith("2", "Error: boom");
  });

  test("stops cleanly when polling fails", async () => {
    const resolvePendingCall = jest.fn();
    const nextPendingCall = jest.fn().mockRejectedValueOnce(new Error("poll failed"));
    const inner = { nextPendingCall, resolvePendingCall } as any;
    const parseArgs = () => [];

    await expect(
      runToolPollingLoop(inner, parseArgs, async () => "ok"),
    ).resolves.toBeUndefined();
    expect(resolvePendingCall).not.toHaveBeenCalled();
  });
});
