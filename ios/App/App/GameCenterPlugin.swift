import Capacitor
import GameKit

@objc(GameCenterPlugin)
public class GameCenterPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GameCenterPlugin"
    public let jsName = "GameCenter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showLeaderboard", returnType: CAPPluginReturnPromise),
    ]

    @objc func authenticate(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            GKLocalPlayer.local.authenticateHandler = { viewController, error in
                if let vc = viewController {
                    self.bridge?.viewController?.present(vc, animated: true)
                    call.resolve(["authenticated": false])
                    return
                }
                if let error = error {
                    call.reject("Authentication failed", nil, error)
                    return
                }
                let player = GKLocalPlayer.local
                call.resolve([
                    "authenticated": player.isAuthenticated,
                    "displayName": player.displayName,
                    "playerID": player.gamePlayerID
                ])
            }
        }
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        guard GKLocalPlayer.local.isAuthenticated else {
            call.reject("Player not authenticated")
            return
        }
        guard let score = call.getInt("score"),
              let leaderboardID = call.getString("leaderboardID") else {
            call.reject("Missing score or leaderboardID")
            return
        }

        GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local,
                                  leaderboardIDs: [leaderboardID]) { error in
            if let error = error {
                call.reject("Failed to submit score", nil, error)
            } else {
                call.resolve(["submitted": true])
            }
        }
    }

    @objc func showLeaderboard(_ call: CAPPluginCall) {
        guard GKLocalPlayer.local.isAuthenticated else {
            call.reject("Player not authenticated")
            return
        }
        let leaderboardID = call.getString("leaderboardID") ?? ""

        DispatchQueue.main.async {
            let gcVC = GKGameCenterViewController(state: .leaderboards)
            if !leaderboardID.isEmpty {
                gcVC.leaderboardIdentifier = leaderboardID
            }
            gcVC.gameCenterDelegate = self
            self.bridge?.viewController?.present(gcVC, animated: true)
            call.resolve()
        }
    }
}

extension GameCenterPlugin: GKGameCenterControllerDelegate {
    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }
}
