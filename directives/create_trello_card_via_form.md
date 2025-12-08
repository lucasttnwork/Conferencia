# Create Trello Card via Web Form

## Goal
Enable users to create a Trello card in the "Triagem" list by submitting a web form.

## Inputs
The form must collect:
1.  **Tipo de Ato** (Type of Act)
2.  **Número de Protocolo** (Protocol Number)
3.  **Data para Entrega** (Delivery Date) - Must be at least 48 hours from the current time.
4.  **Informações Extras** (Extra Information) - Text field.

## Processing Logic
1.  **Validation**: Ensure "Data para Entrega" is >= 48 hours from submission.
2.  **Formatting**:
    -   **Card Name**: `[Tipo de Ato] - [Número de Protocolo]` (or similar concatenation).
    -   **Card Description**: Include "Data para Entrega" and "Informações Extras".
3.  **Destination**:
    -   Board ID: (From Environment `TRELLO_BOARD_ID`)
    -   List Name: "Triagem"
    -   List ID: `6866abc12d1dd317b1f980b0` (Retrieved from Trello)

## Tools/Execution
-   **Frontend**: Next.js Page (`/formulario`)
-   **Backend**: Next.js API Route (`/api/trello/create-card`)
-   **Trello API**: `POST /1/cards`

## Output
-   A new card appears in Trello "Triagem" list.
-   User receives success notification on the web page.
